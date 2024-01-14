import * as IconComponents from "@element-plus/icons-vue";
const idMap = JSON.parse(
  `{
	"1032": "黛烟",
	"1015": "维普蕾",
	"1021": "佩里缇亚",
	"1025": "托洛洛",
	"1027": "琼玖",
	"1029": "塞布丽娜",
	"1033": "莫辛 纳甘",

	"1001": "克罗立科",
	"1008": "娜美西丝",
	"1017": "闪电",
	"1009": "寇尔芙",
	"1022": "夏克里",
	"1024": "奇塔",
	"1026": "纳甘",
	"1036": "科谢尼娅",
	"1038": "莉塔拉",

	"11053": "重弦",
	"11016": "猎心者",
	"11020": "光学幻境",
	"11038": "游星",
	"11044": "金石奏",
	"11047": "梅扎露娜",
	"10333": "斯摩希克",

	"11007": "很好用的四星武器",
	"11014": "很好用的四星武器",
	"11023": "很好用的四星武器",
	"11015": "很好用的四星武器",
	"11031": "很好用的四星武器",
	"11040": "很好用的四星武器",
	"11021": "很好用的四星武器",
	"11026": "很好用的四星武器",
	"11037": "很好用的四星武器",
	"11043": "很好用的四星武器",
	"11046": "很好用的四星武器",
	"11049": "很好用的四星武器",
	"10332": "很好用的四星武器",
	"10362": "很好用的四星武器",
	"10382": "很好用的四星武器",

	"11022": "垃圾三星武器",
	"11009": "垃圾三星武器",
	"11010": "垃圾三星武器",
	"11008": "垃圾三星武器",
	"11030": "垃圾三星武器",
	"11039": "垃圾三星武器",
	"11017": "垃圾三星武器",
	"11024": "垃圾三星武器",
	"11036": "垃圾三星武器",
	"11042": "垃圾三星武器",
	"11045": "垃圾三星武器",
	"11048": "垃圾三星武器",
	"10331": "垃圾三星武器",
	"10361": "垃圾三星武器",
	"10381": "垃圾三星武器"
}`
);
const ssrCharacterIds = new Set([1032, 1015, 1021, 1025, 1027, 1029, 1033]);
const srCharacterIds = new Set([
  1001, 1008, 1017, 1009, 1022, 1024, 1026, 1036, 1038,
]);
const ssrWeaponIds = new Set([11053, 11016, 11020, 11038, 11044, 11047, 10333]);
const srWeaponIds = new Set([
  11007, 11014, 11023, 11015, 11031, 11040, 11021, 11026, 11037, 11043, 11046,
  11049, 10332, 10362, 10382,
]);
const trashWeaponIds = new Set([
  11022, 11009, 11010, 11008, 11030, 11039, 11017, 11024, 11036, 11042, 11045,
  11048, 10331, 10361, 10381,
]);
const isCharacter = (id) => ssrCharacterIds.has(id) || srCharacterIds.has(id);
const isWeapon = (id) =>
  ssrWeaponIds.has(id) || srWeaponIds.has(id) || trashWeaponIds.has(id);
const getRarity = (id) => {
  if (ssrCharacterIds.has(id) || ssrWeaponIds.has(id)) return 5;
  if (srCharacterIds.has(id) || srWeaponIds.has(id)) return 4;
  if (trashWeaponIds.has(id)) return 3;
  return 0;
};
const getName = (id) => idMap[id];

const IconInstaller = (app) => {
  Object.values(IconComponents).forEach((component) => {
    app.component(component.name, component);
  });
};

export { isWeapon, isCharacter, getRarity, getName, IconInstaller };
