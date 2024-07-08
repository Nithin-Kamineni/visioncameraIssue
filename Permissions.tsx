import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  ImageRequireSource,
} from 'react-native';
import {Linking} from 'react-native';
import {Camera} from 'react-native-vision-camera';
import {CONTENT_SPACING, SAFE_AREA_PADDING} from './Constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BANNER_IMAGE = require('../../Images/11.png') as ImageRequireSource;

export default function Permissions({navigation}: any) {
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState('not-determined');

  const requestCameraPermission = useCallback(async () => {
    console.log('Requesting camera permission...');
    const permission = await Camera.requestCameraPermission();
    console.log(`Camera permission status: ${permission}`);

    if (permission === 'denied') await Linking.openSettings();
    setCameraPermissionStatus(permission);
  }, []);

  return (
    <>
      <View style={styles.container}>
        <Image source={BANNER_IMAGE} style={styles.banner} />
        <Text style={styles.welcome}>Welcome to{'\n'}Vision Camera.</Text>
        <View style={styles.permissionsContainer}>
          {cameraPermissionStatus !== 'granted' && (
            <Text style={styles.permissionText}>
              Vision Camera needs{' '}
              <Text style={styles.bold}>Camera permission</Text>.{' '}
              <Text style={styles.hyperlink} onPress={requestCameraPermission}>
                Grant
              </Text>
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 38,
    fontWeight: 'bold',
    maxWidth: '80%',
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
