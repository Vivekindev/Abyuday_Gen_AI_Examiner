(function () {
  var preference = "system";
  try {
    preference = localStorage.getItem("abyuday.theme") || "system";
  } catch (_) {
    /* Storage may be disabled. */
  }
  var dark =
    preference === "dark" ||
    (preference !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();
