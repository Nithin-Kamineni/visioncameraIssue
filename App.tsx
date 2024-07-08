/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Image,
  ImageRequireSource,
} from 'react-native';
import {Linking} from 'react-native';
import {Camera} from 'react-native-vision-camera';
import {CONTENT_SPACING, SAFE_AREA_PADDING} from './Constants';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import CameraPage from './Camera';

import {GestureHandlerRootView} from 'react-native-gesture-handler';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BANNER_IMAGE = require('./Images/11.png') as ImageRequireSource;

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState('not-determined');

  // let cameraPermission = 'not-determined';
  useEffect(() => {
    const checkCameraPermission = async () => {
      console.log(
        '------------------------------------------------------------------------------------------------',
      );
      console.log('camera', Camera);
      const cameraPermission = await Camera.getCameraPermissionStatus();
      setCameraPermissionStatus(cameraPermission);
    };
    if (Camera) {
      checkCameraPermission();
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    console.log('Requesting camera permission...');
    const permission = await Camera.requestCameraPermission();
    console.log(`Camera permission status: ${permission}`);

    if (permission === 'denied') await Linking.openSettings();
    setCameraPermissionStatus(permission);
  }, []);

  console.log(`Re-rendering Navigator. Camera: ${cameraPermissionStatus}`);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      {cameraPermissionStatus === 'granted' ? (
        <GestureHandlerRootView style={{flex: 1}}>
          <CameraPage />
        </GestureHandlerRootView>
      ) : (
        <>
          <View>
            <Text>Welcome</Text>
            <Image source={BANNER_IMAGE} style={styles.banner} />
            <Text style={styles.welcome}>Welcome to{'\n'}Vision Camera.</Text>
            <View style={styles.permissionsContainer}>
              {cameraPermissionStatus !== 'granted' && (
                <Text style={styles.permissionText}>
                  Vision Camera needs{' '}
                  <Text style={styles.bold}>Camera permission</Text>.{' '}
                  <Text
                    style={styles.hyperlink}
                    onPress={requestCameraPermission}>
                    Grant
                  </Text>
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 38,
    fontWeight: 'bold',
    maxWidth: '80%',
    color: 'white',
  },
  banner: {
    position: 'absolute',
    opacity: 0.4,
    bottom: 0,
    left: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    ...SAFE_AREA_PADDING,
  },
  permissionsContainer: {
    marginTop: CONTENT_SPACING * 2,
  },
  permissionText: {
    fontSize: 17,
  },
  hyperlink: {
    color: '#007aff',
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
});


export default App;
