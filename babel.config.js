module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'react-native-reanimated/plugin',
      {
        processNestedWorklets: true,
      },
    ],
    'react-native-worklets-core/plugin',
  ],
};
