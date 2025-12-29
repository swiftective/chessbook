export default defineUnlistedScript(() => {
  window.addEventListener("message", (event) => {
    // Safety check: only listen to messages from your own extension
    if (event.data?.source !== "my-svelte-remote") return;

    const { action, params } = event.data;

    if (action === "MAKE_MOVE" && window.lichess?.analysis) {
      // Execute the actual function on the real object instance
      window.lichess.analysis.playUci(params.uci);
    }
  });
});
