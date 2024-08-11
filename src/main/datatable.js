const fs = require("fs-extra");
const path = require("path");
const protobuf = require("./protobuf/compiled");
const utils = require("./utils");
const gamePath = utils.getGamePath();

const LangPackage = (function () {
  const lptcdtBytes = fs.readFileSync(
    path.join(gamePath, "LocalCache/Data/Table/LangPackageTableCnData.bytes")
  );
  const lptcdmsg = protobuf.LangPackageTableCnDataTable.decode(
    lptcdtBytes.subarray(lptcdtBytes.readInt32LE() + 1)
  );
  return lptcdmsg["Data"];
})();
const Characters = (function () {
  const bytes = fs.readFileSync(
    path.join(gamePath, "LocalCache/Data/Table/GunData.bytes")
  );
  const msg = protobuf.GunDataTable.decode(
    bytes.subarray(bytes.readInt32LE() + 1)
  );
  return msg["Data"];
})();
const Weapons = (function () {
  const bytes = fs.readFileSync(
    path.join(gamePath, "LocalCache/Data/Table/GunWeaponData.bytes")
  );
  const msg = protobuf.GunWeaponDataTable.decode(
    bytes.subarray(bytes.readInt32LE())
  );
  return msg["Data"];
})();
const NameRarityDictionary = {};
Characters.forEach((chara) => {
  var name = LangPackage.find((x) => x.Id.low == chara.Name.Id).Content;
  var rank = chara.Rank;
  NameRarityDictionary[chara.Id] = { name, rank, isCharacter: true };
});
Weapons.forEach((weapon) => {
  var name = LangPackage.find((x) => x.Id.low == weapon.Name.Id).Content;
  var rank = weapon.Rank;
  NameRarityDictionary[weapon.Id] = { name, rank, isCharacter: false };
});

module.exports = {
  NameRarityDictionary,
};
