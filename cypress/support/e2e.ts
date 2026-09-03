import "./commands";

/**
 * The app logs verbosely and the Firebase SDK can emit benign warnings after a
 * test ends. Fail only on genuine application errors.
 */
Cypress.on("uncaught:exception", (err) => {
  const benign = [
    "ResizeObserver loop",
    "Failed to fetch dynamically imported module",
  ];
  return !benign.some((message) => err.message.includes(message));
});
