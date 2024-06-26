const itemCount = (map, id) => {
  if (!map.has(id)) {
    map.set(id, 1);
  } else {
    map.set(id, map.get(id) + 1);
  }
};
const gachaDetail = (data) => {
  const detailMap = new Map();
  for (let [key, value] of data) {
    let detail = {
      count3: 0,
      count4: 0,
      count5: 0,
      count3w: 0,
      count4w: 0,
      count5w: 0,
      count4c: 0,
      count5c: 0,
      weapon3: new Map(),
      weapon4: new Map(),
      weapon5: new Map(),
      char4: new Map(),
      char5: new Map(),
      date: [],
      ssrPos: [],
      countMio: 0,
      total: value.length,
    };
    let lastSSR = 0;
    let dateMin = 0;
    let dateMax = 0;
    value.forEach((item, index) => {
      const [id, name, rank, isCharacter, pool, time] = item;
      const timestamp = new Date(time * 1000).getTime();
      if (!dateMin) dateMin = timestamp;
      if (!dateMax) dateMax = timestamp;
      if (dateMin > timestamp) dateMin = timestamp;
      if (dateMax < timestamp) dateMax = timestamp;
      if (rank === 3) {
        detail.count3++;
        detail.countMio++;
        if (!isCharacter) {
          detail.count3w++;
          itemCount(detail.weapon3, id);
        }
      } else if (rank === 4) {
        detail.count4++;
        detail.countMio++;
        if (!isCharacter) {
          detail.count4w++;
          itemCount(detail.weapon4, id);
        } else if (isCharacter) {
          detail.count4c++;
          itemCount(detail.char4, id);
        }
      } else if (rank === 5) {
        detail.ssrPos.push([name, index + 1 - lastSSR, time, pool]);
        lastSSR = index + 1;
        detail.count5++;
        detail.countMio = 0;
        if (!isCharacter) {
          detail.count5w++;
          itemCount(detail.weapon5, id);
        } else if (isCharacter) {
          detail.count5c++;
          itemCount(detail.char5, id);
        }
      }
    });
    detail.date = [dateMin, dateMax];
    if (detail.total) {
      detailMap.set(key, detail);
    }
  }
  return detailMap;
};

export default gachaDetail;
