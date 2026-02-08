import React from "react";
import { render } from "ink";
import { App } from "./App.tsx";

const enterAltScreen = "\x1b[?1049h";
const leaveAltScreen = "\x1b[?1049l";

export async function launchTui() {
  // Enter alternate screen buffer before ink starts
  process.stdout.write(enterAltScreen);

  // Safety net: always leave alt screen on process exit
  const cleanup = () => process.stdout.write(leaveAltScreen);
  process.on("exit", cleanup);

  try {
    const instance = render(<App />);
    await instance.waitUntilExit();
  } finally {
    cleanup();
    process.off("exit", cleanup);
  }
}
