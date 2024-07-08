import * as React from 'react';
import {useRef, useState, useCallback, useMemo} from 'react';
import type {GestureResponderEvent} from 'react-native';
import {StyleSheet, Text, View, StatusBar} from 'react-native';
import type {PinchGestureHandlerGestureEvent} from 'react-native-gesture-handler';
import {
  PinchGestureHandler,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import type {
  CameraProps,
  CameraRuntimeError,
  PhotoFile,
  VideoFile,
} from 'react-native-vision-camera';
import {
  runAtTargetFps,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  useLocationPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import {
  Camera,
  useCameraDevices,
  getCameraDevice,
} from 'react-native-vision-camera';
import {
  CONTENT_SPACING,
  CONTROL_BUTTON_SIZE,
  MAX_ZOOM_FACTOR,
  SAFE_AREA_PADDING,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './Constants';
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import {useEffect} from 'react';

// import {StatusBarBlurBackground} from './StatusBarBlurBackground';
import {CaptureButton} from './components/CaptureButton';

// import {useIsFocused} from '@react-navigation/core';

import {useIsForeground} from './hooks/useIsForeground';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({
  zoom: true,
});

const SCALE_FULL_ZOOM = 3;

export default function CameraView(): React.ReactElement {
  const camera = useRef<Camera>(null);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const zoom = useSharedValue(1);
  const isPressingButton = useSharedValue(false);
  const lastFrameTime = useSharedValue(Date.now());

  // check if camera page is active
  //   const isFocussed = useIsFocused();
  const isForeground = useIsForeground();
  //   const isActive = isFocussed && isForeground;
  const isActive = isForeground;

  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(
    'back',
  );
  const [enableHdr, setEnableHdr] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [enableNightMode, setEnableNightMode] = useState(false);

  // camera device settings
  //   const [preferredDevice] = usePreferredCameraDevice();

  const devices = useCameraDevices();
  const preferredDevice = getCameraDevice(devices, 'back');

  let device = useCameraDevice(cameraPosition);

  if (preferredDevice != null && preferredDevice.position === cameraPosition) {
    // override default device with the one selected by the user in settings
    device = preferredDevice;
  }

  const [targetFps, setTargetFps] = useState(15);

  const screenAspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;

  const format = useCameraFormat(device, [
    {fps: targetFps},
    {videoAspectRatio: screenAspectRatio},
    {videoResolution: 'max'},
    {photoAspectRatio: screenAspectRatio},
    {photoResolution: 'max'},
  ]);

  const fps = Math.min(format?.maxFps ?? 1, targetFps);

  const supportsFlash = device?.hasFlash ?? false;
  const supportsHdr = format?.supportsPhotoHdr;

  const supports60Fps = useMemo(
    () => device?.formats.some(f => f.maxFps >= 60),
    [device?.formats],
  );
  const canToggleNightMode = device?.supportsLowLightBoost ?? false;

  //#region Animated Zoom
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

  const cameraAnimatedProps = useAnimatedProps<CameraProps>(() => {
    const z = Math.max(Math.min(zoom.value, maxZoom), minZoom);
    return {
      zoom: z,
    };
  }, [maxZoom, minZoom, zoom]);
  //#endregion

  //#region Callbacks
  const setIsPressingButton = useCallback(
    (_isPressingButton: boolean) => {
      isPressingButton.value = _isPressingButton;
    },
    [isPressingButton],
  );
  const onError = useCallback((error: CameraRuntimeError) => {
    console.error(error);
  }, []);
  const onInitialized = useCallback(() => {
    console.log('Camera initialized!');
    setIsCameraInitialized(true);
  }, []);

  const onFlipCameraPressed = useCallback(() => {
    setCameraPosition(p => (p === 'back' ? 'front' : 'back'));
  }, []);
  const onFlashPressed = useCallback(() => {
    setFlash(f => (f === 'off' ? 'on' : 'off'));
  }, []);
  //#endregion

  //#region Tap Gesture
  const onFocusTap = useCallback(
    ({nativeEvent: event}: GestureResponderEvent) => {
      if (!device?.supportsFocus) return;
      camera.current?.focus({
        x: event.locationX,
        y: event.locationY,
      });
    },
    [device?.supportsFocus],
  );
  const onDoubleTap = useCallback(() => {
    onFlipCameraPressed();
  }, [onFlipCameraPressed]);
  //#endregion

  //#region Effects
  useEffect(() => {
    // Reset zoom to it's default everytime the `device` changes.
    zoom.value = device?.neutralZoom ?? 1;
  }, [zoom, device]);
  //#endregion

  //#region Pinch to Zoom Gesture
  // The gesture handler maps the linear pinch gesture (0 - 1) to an exponential curve since a camera's zoom
  // function does not appear linear to the user. (aka zoom 0.1 -> 0.2 does not look equal in difference as 0.8 -> 0.9)
  //   const onPinchGesture = useAnimatedGestureHandler<
  //     PinchGestureHandlerGestureEvent,
  //     {startZoom?: number}
  //   >({
  //     onStart: (_: any, context: {startZoom: any}) => {
  //       context.startZoom = zoom.value;
  //     },
  //     onActive: (event: {scale: any}, context: {startZoom: number}) => {
  //       // we're trying to map the scale gesture to a linear zoom here
  //       const startZoom = context.startZoom ?? 0;
  //       const scale = interpolate(
  //         event.scale,
  //         [1 - 1 / SCALE_FULL_ZOOM, 1, SCALE_FULL_ZOOM],
  //         [-1, 0, 1],
  //         Extrapolate.CLAMP,
  //       );
  //       zoom.value = interpolate(
  //         scale,
  //         [-1, 0, 1],
  //         [minZoom, startZoom, maxZoom],
  //         Extrapolate.CLAMP,
  //       );
  //     },
  //   });
  //#endregion

  const onMediaCaptured = useCallback(
    (media: PhotoFile | VideoFile, type: 'photo' | 'video') => {
      console.log(`Media captured! ${JSON.stringify(media)}`);
      // navigation.navigate('MediaPage', {
      //   path: media.path,
      //   type: type,
      // })
    },
    [],
  );

  useEffect(() => {
    const f =
      format != null
        ? `(${format.photoWidth}x${format.photoHeight} photo / ${format.videoWidth}x${format.videoHeight}@${format.maxFps} video @ ${fps}fps)`
        : undefined;
    console.log(`Camera: ${device?.name} | Format: ${f}`);
  }, [device?.name, format, fps]);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';

    runAtTargetFps(0.5, () => {
      //every 2 seconds
      'worklet';
      console.log(
        `${frame.timestamp}: ${frame.width}x${frame.height} ${frame.pixelFormat} Frame (${frame.orientation})`,
      );
    });
  }, []);

  const videoHdr = format?.supportsVideoHdr && enableHdr;
  const photoHdr = format?.supportsPhotoHdr && enableHdr && !videoHdr;

  return (
    <>
      <View style={styles.container}>
        {device != null && (
          <PinchGestureHandler
            // onGestureEvent={onPinchGesture}
            enabled={isActive}>
            <Reanimated.View
              onTouchEnd={onFocusTap}
              style={StyleSheet.absoluteFill}>
              <ReanimatedCamera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                ref={camera}
                onInitialized={onInitialized}
                onError={onError}
                onStarted={() => console.log('Camera started!')}
                onStopped={() => console.log('Camera stopped!')}
                onPreviewStarted={() => console.log('Preview started!')}
                onPreviewStopped={() => console.log('Preview stopped!')}
                onOutputOrientationChanged={(o: any) =>
                  console.log(`Output orientation changed to ${o}!`)
                }
                onPreviewOrientationChanged={(o: any) =>
                  console.log(`Preview orientation changed to ${o}!`)
                }
                format={format}
                fps={fps}
                photoHdr={photoHdr}
                videoHdr={videoHdr}
                photoQualityBalance="quality"
                lowLightBoost={device.supportsLowLightBoost && enableNightMode}
                enableZoomGesture={false}
                animatedProps={cameraAnimatedProps}
                exposure={0}
                enableFpsGraph={true}
                outputOrientation="device"
                photo={true}
                video={true}
                frameProcessor={frameProcessor}
              />
            </Reanimated.View>
          </PinchGestureHandler>
        )}

        <CaptureButton
          style={styles.captureButton}
          camera={camera}
          onMediaCaptured={onMediaCaptured}
          cameraZoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          flash={supportsFlash ? flash : 'off'}
          enabled={isCameraInitialized && isActive}
          setIsPressingButton={setIsPressingButton}
        />

        {/* <StatusBarBlurBackground /> */}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  captureButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: SAFE_AREA_PADDING.paddingBottom,
  },
  button: {
    marginBottom: CONTENT_SPACING,
    width: CONTROL_BUTTON_SIZE,
    height: CONTROL_BUTTON_SIZE,
    borderRadius: CONTROL_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(140, 140, 140, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtonRow: {
    position: 'absolute',
    right: SAFE_AREA_PADDING.paddingRight,
    top: SAFE_AREA_PADDING.paddingTop,
  },
  text: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: SAFE_AREA_PADDING.paddingTop + 10,
    left: SAFE_AREA_PADDING.paddingLeft + 10,
    width: CONTROL_BUTTON_SIZE,
    height: CONTROL_BUTTON_SIZE,
    borderRadius: CONTROL_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(140, 140, 140, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
