const origExit = process.exit.bind(process);
process.exit = (code) => {
  console.log("process.exit() called with code:", code);
  console.trace("exit call site");
  origExit(code);
};
process.on("exit", (code) => {
  console.log("EXIT EVENT, code =", code);
});
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:", err);
});
require("./node_modules/expo/bin/cli");