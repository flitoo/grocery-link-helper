/**
 * Runs `task` now and then again `intervalMs` after each run finishes, so a
 * slow run never overlaps the next. A failing run is logged and retried on the
 * next interval. Returns a function that stops the schedule.
 */
function startPeriodicTask({ task, intervalMs = 60000, logger = console, errorMessage = 'Background task failed:' }) {
  let stopped = false;
  let timer;
  async function tick() {
    try { await task(); }
    catch (error) { logger.error(errorMessage, error); }
    finally {
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
        timer.unref?.();
      }
    }
  }
  void tick();
  return () => { stopped = true; clearTimeout(timer); };
}

module.exports = { startPeriodicTask };
