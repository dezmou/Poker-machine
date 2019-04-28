import tracker from "./tracker";
import { Game, WinamaxGame } from "./game";

(async () => {
  await tracker.init()
  const chien = await tracker.getHandById(500004);
  new WinamaxGame(chien);

})()