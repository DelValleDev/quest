module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!@react-native|@react-navigation|react-native|@react-navigation/native-stack)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  setupFiles: ["./jest.setup.js"],
};
