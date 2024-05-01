const fs = require("fs-extra");
const path = require("path");
const { URL } = require("url");
const { app, ipcMain, shell, clipboard } = require("electron");
const {
  readdir,
  sleep,
  request,
  sendMsg,
  readJSON,
  saveJSON,
  userDataPath,
  userPath,
  localIp,
  langMap,
} = require("./utils");
const config = require("./config");
const i18n = require("./i18n");
const { enableProxy, disableProxy } = require("./module/system-proxy");
const mitmproxy = require("./module/node-mitmproxy");
const { NameRarityDictionary } = require("./datatable");

const dataMap = new Map();
var gachaUrl;

const saveData = async (data, url) => {
  const obj = Object.assign({}, data);
  obj.result = [...obj.result];
  obj.typeMap = [...obj.typeMap];
  config.urls.set(data.account, url);
  await config.save();
  await saveJSON(`gacha-list-${data.account}.json`, obj);
};

const defaultTypeMap = new Map([
  ["1", "常规采购"],
  ["3", "定向采购"],
  ["4", "军备提升"],
]);
/*
  ["5001", "军备提升α"],
  ["2001", "军备提升β"],
  ["3001", "定向采购β"],
  ["6001", "定向采购α"],
  ["1001", "常规采购"],
 */

let localDataReaded = false;
/**
 * 从JSON中读取以前的数据
 * @returns
 */
const readData = async () => {
  if (localDataReaded) return;
  localDataReaded = true;
  await fs.ensureDir(userDataPath);
  const files = await readdir(userDataPath);
  for (let name of files) {
    if (/^gacha-list-\d+\.json$/.test(name)) {
      try {
        const data = await readJSON(name);
        data.typeMap = new Map(data.typeMap) || defaultTypeMap;
        data.result = new Map(data.result);
        if (data.account) {
          dataMap.set(data.account, data);
        }
      } catch (e) {
        sendMsg(e, "ERROR");
      }
    }
  }
  if (
    (!config.current && dataMap.size) ||
    (config.current && dataMap.size && !dataMap.has(config.current))
  ) {
    await changeCurrent(dataMap.keys().next().value);
  }
};

const changeCurrent = async (uid) => {
  config.current = uid;
  await config.save();
};

const compareList = (b, a) => {
  if (!b.length) return false;
  if (b.length < a.length) {
    a = a.slice(0, b.length);
  }
  const strA = a.map((item) => item.slice(0, 4).join("-")).join(",");
  const strB = b.map((item) => item.slice(0, 4).join("-")).join(",");
  return strA === strB;
};

const mergeList = (a, b) => {
  if (!a || !a.length) return b || [];
  if (!b || !b.length) return a;
  const minA = new Date(a[0][5]).getTime();
  let pos = b.length;
  let width = Math.min(11, a.length, b.length);
  for (let i = 0; i < b.length; i++) {
    const time = new Date(b[i][5]).getTime();
    if (time >= minA) {
      if (compareList(b.slice(i, width + i), a.slice(0, width))) {
        pos = i;
        break;
      }
    }
  }
  return b.slice(0, pos).concat(a);
};

const mergeData = (local, origin) => {
  if (local && local.result) {
    const localResult = local.result;
    const localAccount = local.account;
    const originAccount = origin.account;
    if (localAccount !== originAccount) return origin.result;
    const originResult = new Map();
    for (let [key, value] of origin.result) {
      const newVal = mergeList(value, localResult.get(key));
      originResult.set(key, newVal);
    }
    return originResult;
  }
  return origin.result;
};

const detectGameType = async (userPath) => {
  let list = [];
  const lang = app.getLocale();
  try {
    await fs.access(
      path.join(
        userPath,
        "/AppData/LocalLow/SunBorn/",
        "少女前线2：追放/Player.log"
      ),
      fs.constants.F_OK
    );
    list.push("少女前线2：追放");
  } catch (e) {}
  if (config.logType) {
    if (config.logType === 2) {
      list.reverse();
    } else if (config.logType === 3) {
      list = [];
    }
    list = list.slice(0, 1);
  } else if (lang !== "zh-CN") {
    list.reverse();
  }
  return list;
};

let cacheFolder = null;

/**
 * 从Log文件中获取抽卡记录的URL和accessToken
 * @returns \{url,accessToken\}
 */
const readLog = async () => {
  const text = i18n.log;
  try {
    let userPath;
    if (!process.env.WINEPREFIX) {
      userPath = app.getPath("home");
    } else {
      userPath = path.join(
        process.env.WINEPREFIX,
        "drive_c/users",
        process.env.USER
      );
    }
    const gameNames = await detectGameType(userPath);
    if (!gameNames.length) {
      sendMsg(text.file.notFound);
      return false;
    }
    const promises = gameNames.map(async (name) => {
      const logText = (
        await fs.readFile(
          `${userPath}/AppData/LocalLow/SunBorn/${name}/Player.log`,
          "utf8"
        )
      )
        .split(/\r?\n/)
        .reverse();

      const url_reg = "\"k\":\"gacha_record_url\",\"v\":\"(.+?)\"";
      var addr = undefined;
      logText.forEach((value, index, array) => {
        if (addr)
          return;
        var reg_result = value.match(url_reg);
        if (reg_result)
          addr = reg_result[1];
      });

      if (!addr)
      {
        throw Error("Url not found");
      }
      // console.log(addr);

      // Gacha record address is most likely the following, but implemented a regex search function just in case.
      // const addr = "https://gf2-gacha-record.sunborngame.com/list";
      gachaUrl = addr;
      const accessTokenLine = logText
        .find((x) =>
          x.startsWith(
            'Response = {"code":0,"msg":"OK","data":{"access_token":"'
          )
        )
        .replace("Response = ", "");
      const accessTokenJson = JSON.parse(accessTokenLine);
      const accessToken = accessTokenJson.data.access_token;
      return { url: addr, accessToken: accessToken };
    });
    const result = await Promise.all(promises);
    for (let url of result) {
      if (url) {
        return url;
      }
    }
    sendMsg(text.url.notFound);
    return false;
  } catch (e) {
    sendMsg(text.file.readFailed);
    return false;
  }
};

/**
 * 获得单页的抽卡记录
 * @param {*} key aa
 * @returns
 */
const getGachaLog = async ({ gachaType, fragment, name, retryCount, ua }) => {
  const text = i18n.log;
  const payload =
    fragment === ""
      ? `type_id=${gachaType}`
      : `next=${fragment}&type_id=${gachaType}`;
  try {
    const res = await request(ua, payload);
    return [res.data.list, res.data.next];
  } catch (e) {
    if (retryCount) {
      sendMsg(
        i18n.parse(text.fetch.retry, { name, fragment, count: 6 - retryCount })
      );
      await sleep(5);
      retryCount--;
      return await getGachaLog({
        gachaType,
        fragment,
        name,
        retryCount,
        ua,
      });
    } else {
      sendMsg(i18n.parse(text.fetch.retryFailed, { name, fragment }));
      throw e;
    }
  }
};

/**
 * 获得当前类别的全部可查询到的抽卡记录
 * @param {*} param0
 * @param {*} queryString
 * @returns
 */
const getGachaLogs = async (gachaType, name, account, ua) => {
  const text = i18n.log;
  let page = 1;
  let fragment = "";
  let list = [];
  let res = [];
  do {
    sendMsg(i18n.parse(text.fetch.current, { name, page }));
    [res, fragment] = await getGachaLog({
      gachaType,
      fragment,
      name,
      ua,
      retryCount: 5,
    });
    page += 1;
    await sleep(0.25);
    list.push(...res);

    if (
      !config.fetchFullHistory &&
      res.length &&
      account &&
      dataMap.has(account)
    ) {
      const result = dataMap.get(account).result;
      if (result.has(gachaType)) {
        const arr = result.get(gachaType);
        if (arr.length) {
          const localLatestId = arr[arr.length - 1][5];
          if (localLatestId) {
            let shouldBreak = false;
            res.forEach((item) => {
              if (item.id === localLatestId) {
                shouldBreak = true;
              }
            });
            if (shouldBreak) {
              break;
            }
          }
        }
      }
    }
  } while (fragment !== "");
  return list;
};

/**
 * ??????
 * @param {*} port
 * @returns
 */
const proxyServer = (port) => {
  return new Promise((rev) => {
    mitmproxy.createProxy({
      sslConnectInterceptor: (req) => {
        if (/webstatic([^\.]{2,10})?\.(mihoyo|hoyoverse)\.com/.test(req.url)) {
          return true;
        }
      },
      requestInterceptor: (rOptions, req, res, ssl, next) => {
        next();
        if (
          /webstatic([^\.]{2,10})?\.(mihoyo|hoyoverse)\.com/.test(
            rOptions.hostname
          )
        ) {
          if (/authkey=[^&]+/.test(rOptions.path)) {
            rev(`${rOptions.protocol}//${rOptions.hostname}${rOptions.path}`);
          }
        }
      },
      responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
        next();
      },
      getPath: () => path.join(userPath, "node-mitmproxy"),
      port,
    });
  });
};

let proxyServerPromise;
const useProxy = async () => {
  const text = i18n.log;
  const ip = localIp();
  const port = config.proxyPort;
  sendMsg(i18n.parse(text.proxy.hint, { ip, port }));
  await enableProxy("127.0.0.1", port);
  if (!proxyServerPromise) {
    proxyServerPromise = proxyServer(port);
  }
  const url = await proxyServerPromise;
  await disableProxy();
  return url;
};

const tryRequest = async (urlAndAccessToken, retry = false) => {
  try {
    const res = await request(urlAndAccessToken, "type_id=1");
    if (res.retcode !== 0) {
      return false;
    }
    return true;
  } catch (e) {
    if (e.code === "ERR_PROXY_CONNECTION_FAILED" && !retry) {
      await disableProxy();
      return await tryRequest(urlAndAccessToken, true);
    }
    sendMsg(e.message.replace(urlAndAccessToken, "***"), "ERROR");
    throw e;
  }
};

/**
 * 从Log中读取抽卡日志的URL和AccessToken
 * @returns [抽卡日志的URL,AccessToken]
 */
const getUrlAndAccessToken = async () => {
  let ua = await readLog();
  if (!ua && config.proxyMode) {
    ua.url = await useProxy();
  } else if (ua) {
    const result = await tryRequest(ua);
    if (!result && config.proxyMode) {
      ua.url = await useProxy();
    }
  }
  return ua;
};

const fetchData = async () => {
  const text = i18n.log;
  await readData();
  let ua = await getUrlAndAccessToken();
  if (!ua) {
    const message = text.url.notFound2;
    sendMsg(message);
    throw new Error(message);
  }
  const { searchParams } = new URL(ua.url);
  if (!searchParams) {
    const message = text.url.incorrect;
    sendMsg(message);
    throw new Error(message);
  }
  const account = searchParams.get("u");

  const result = new Map();
  const typeMap = new Map();
  for (const type of defaultTypeMap) {
    const list = await getGachaLogs(type[0], type[1], account, ua);
    const logs = list.map((item) => {
      var tabledata = NameRarityDictionary[item.item];
      return [
        item.item,
        tabledata.name,
        tabledata.rank,
        tabledata.isCharacter,
        item.pool_id,
        item.time,
      ];
    });
    logs.reverse();
    typeMap.set(type[0], type[1]);
    result.set(type[0], logs);
  }
  const data = { result, time: Date.now(), typeMap, account: account };
  const localData = dataMap.get(account);
  const mergedResult = mergeData(localData, data);
  data.result = mergedResult;
  dataMap.set(account, data);
  await changeCurrent(account);
  await saveData(data, ua.url);
};

let proxyStarted = false;
const fetchDataByProxy = async () => {
  if (proxyStarted) return;
  proxyStarted = true;
  const url = await useProxy();
  await fetchData(url);
};

ipcMain.handle("FETCH_DATA", async (event, param) => {
  try {
    if (param === "proxy") {
      await fetchDataByProxy();
    } else {
      await fetchData(param);
    }
    return {
      dataMap,
      current: config.current,
    };
  } catch (e) {
    sendMsg(e, "ERROR");
    console.error(e);
  }
  return false;
});

ipcMain.handle("READ_DATA", async () => {
  await readData();
  return {
    dataMap,
    current: config.current,
  };
});

ipcMain.handle("CHANGE_UID", (event, uid) => {
  config.current = uid;
});

ipcMain.handle("GET_CONFIG", () => {
  return config.value();
});

ipcMain.handle("LANG_MAP", () => {
  return langMap;
});

ipcMain.handle("SAVE_CONFIG", (event, [key, value]) => {
  config[key] = value;
  config.save();
});

ipcMain.handle("DISABLE_PROXY", async () => {
  await disableProxy();
});

ipcMain.handle("I18N_DATA", () => {
  return i18n.data;
});

ipcMain.handle("OPEN_CACHE_FOLDER", () => {
  if (cacheFolder) {
    shell.openPath(cacheFolder);
  }
});

ipcMain.handle("COPY_URL", async () => {
  const url = gachaUrl;
  if (url) {
    clipboard.writeText(url);
    return true;
  }
  return false;
});

exports.getData = () => {
  return {
    dataMap,
    current: config.current,
  };
};
