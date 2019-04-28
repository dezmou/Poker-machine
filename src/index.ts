import tracker from "./tracker";
import { Game, WinamaxGame } from "./game";

(async () => {
  await tracker.init()
  // const chien = await tracker.getHandById(60792);
  new WinamaxGame();

})()
