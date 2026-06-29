import React, { useContext, useEffect, useRef, useState } from 'react';
import ChannelInfo from './ChannelInfo';
import TVGuide from './TVGuide';
import ChannelHeader from './ChannelHeader';
import ChannelList from './ChannelList';
import ChannelSettings from './ChannelSettings';
import EPGUtils from '../utils/EPGUtils';
import AppContext, { AppVisibilityState } from '../AppContext';
import '../styles/app.css';
import StorageHelper from '../utils/StorageHelper';
import EPGEvent from '../models/EPGEvent';
import { AppViewState } from '../App';
import { useVideoElement } from '../hooks/useVideoElement';

export enum State {
    TV = 'tv',
    EPG = 'epg',
    CHANNEL_LIST = 'channleList',
    CHANNEL_INFO = 'channelInfo',
    CHANNEL_SETTINGS = 'channelSettings'
}

const TV = () => {
    const {
        menuState,
        appViewState,
        appVisibilityState,
        tvhDataService,
        epgData,
        currentChannelPosition,
        setCurrentChannelPosition
    } = useContext(AppContext);

    const tvWrapper = useRef<HTMLDivElement>(null);
    const timeoutChangeChannel = useRef<NodeJS.Timeout | null>(null);
    const {
        videoRef,
        audioTracksRef,
        textTracksRef,
        getMediaElement,
        resetPlayer,
        changeSource,
        setAudioTracks,
        setTextTracks,
        getWidth,
        getHeight
    } = useVideoElement();

    const [state, setState] = useState<State>(State.CHANNEL_INFO);
    const [channelNumberText, setChannelNumberText] = useState('');

    const focus = () => tvWrapper.current?.focus();
    const getCurrentChannel = () => epgData.getChannel(currentChannelPosition);

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (menuState) {
            return;
        }
        const keyCode = event.keyCode;

        switch (keyCode) {
            case 48: case 49: case 50: case 51: case 52:
            case 53: case 54: case 55: case 56: case 57:
                event.stopPropagation();
                enterChannelNumberPart(keyCode - 48);
                break;
            case 34:
                event.stopPropagation();
                if (currentChannelPosition === 0) return;
                changeChannelPosition(currentChannelPosition - 1);
                break;
            case 40:
                event.stopPropagation();
                setState(State.CHANNEL_LIST);
                break;
            case 33:
                event.stopPropagation();
                if (currentChannelPosition === epgData.getChannelCount() - 1) return;
                changeChannelPosition(currentChannelPosition + 1);
                break;
            case 67:
            case 38:
                event.stopPropagation();
                setState(State.CHANNEL_LIST);
                break;
            case 39:
                if (state === State.CHANNEL_SETTINGS) {
                    event.stopPropagation();
                }
                break;
            case 37:
            case 406:
            case 66:
                event.stopPropagation();
                setState(State.EPG);
                break;
            case 13: {
                event.stopPropagation();
                handleChannelInfoSwitch();
                break;
            }
            case 405:
            case 89:
                event.stopPropagation();
                handleChannelSettingsSwitch();
                break;
            case 403: {
                event.stopPropagation();
                const channel = getCurrentChannel();
                const epgEvent = channel?.getEvents().find((e) => e.isCurrent());
                epgEvent && toggleRecording(epgEvent);
                break;
            }
            case 461:
                event.stopPropagation();
                setState(State.TV);
                break;
            default:
                console.log('TV-keyPressed:', keyCode);
        }
    };

    const handleChannelInfoSwitch = () => {
        state !== State.CHANNEL_INFO ? setState(State.CHANNEL_INFO) : setState(State.TV);
    };

    const handleChannelSettingsSwitch = () => {
        if (!audioTracksRef.current && !textTracksRef.current) return;
        state !== State.CHANNEL_SETTINGS ? setState(State.CHANNEL_SETTINGS) : setState(State.TV);
    };

    const handleScrollWheel = () => setState(State.CHANNEL_LIST);
    const handleClick = () => handleChannelInfoSwitch();

    const toggleRecording = (epgEvent: EPGEvent, callback?: () => unknown) => {
        if (!epgEvent) return;
        if (epgEvent.isPastDated(EPGUtils.getNow())) return;

        if (tvhDataService) {
            const recEvent = epgData.getRecording(epgEvent);
            if (recEvent) {
                tvhDataService.cancelRec(recEvent, (recordings) => {
                    epgData.updateRecordings(
                        recordings.filter((rec) => rec.getKind() === 'REC_UPCOMING').map((rec) => rec.getEvents()[0])
                    );
                    callback?.();
                });
            } else {
                tvhDataService.createRec(epgEvent, (recordings) => {
                    epgData.updateRecordings(recordings);
                    callback?.();
                });
            }
        }
    };

    const enterChannelNumberPart = (digit: number) => {
        if (channelNumberText.length < 3) {
            const newChannelNumberText = channelNumberText + digit;
            setChannelNumberText(newChannelNumberText);

            timeoutChangeChannel.current && clearTimeout(timeoutChangeChannel.current);
            timeoutChangeChannel.current = setTimeout(() => {
                const channelNumber = parseInt(newChannelNumberText);
                epgData.getChannels().forEach((channel, channelPosition) => {
                    if (channel.getChannelID() === channelNumber) {
                        changeChannelPosition(channelPosition);
                    }
                });
            }, 3000);
        } else {
            setChannelNumberText('');
        }
    };

    const changeChannelPosition = (newChannelPosition: number) => {
        if (newChannelPosition === currentChannelPosition) return;
        setCurrentChannelPosition(newChannelPosition);
    };

    const handleLoadedMetaData = () => {
        const videoElement = getMediaElement();
        if (!videoElement) return;

        const audioTracks = videoElement.audioTracks;
        const textTracks = videoElement.textTracks;
        const currentChannel = getCurrentChannel();
        if (!currentChannel) return;
        const index = StorageHelper.getLastAudioTrackIndex(currentChannel.getName());
        if (index && index < audioTracks.length) {
            console.log('restore index %d for channel %s', index, currentChannel.getName());
            for (let i = 0; i < audioTracks.length; i++) {
                audioTracks[i].enabled = i === index;
            }
        }

        setAudioTracks(audioTracks);
        setTextTracks(textTracks);
    };

    const showCurrentChannelNumber = () => {
        const channel = epgData.getChannel(currentChannelPosition);
        setChannelNumberText(channel?.getChannelID().toString() || '');
    };

    const updateStreamSource = (streamUrl: URL) => {
        setState(State.CHANNEL_INFO);
        changeSource(streamUrl, 'channel');
        showCurrentChannelNumber();
    };

    useEffect(() => {
        focus();

        return () => {
            const videoElement = getMediaElement();
            if (!videoElement) return;
            resetPlayer(videoElement);
        };
    }, []);

    useEffect(() => {
        if (epgData.getChannelCount() > 0) {
            const currentChannel = getCurrentChannel();
            if (currentChannel && currentChannel.getChannelID() !== currentChannelPosition) {
                updateStreamSource(currentChannel.getStreamUrl());
                StorageHelper.setLastChannelIndex(currentChannelPosition);
            }
        }
    }, [currentChannelPosition]);

    useEffect(() => {
        if (state === State.CHANNEL_INFO) {
            showCurrentChannelNumber();
        }

        if (state === State.TV || state === State.CHANNEL_INFO) {
            focus();
        }
    }, [state]);

    useEffect(() => {
        if (appViewState === AppViewState.TV) {
            focus();
        }
    }, [appViewState, menuState]);

    useEffect(() => {
        if (appVisibilityState === AppVisibilityState.FOCUSED) {
            console.log('TV: changed to focused');
            setState(State.CHANNEL_INFO);
            showCurrentChannelNumber();
            focus();
        }

        if (appVisibilityState === AppVisibilityState.BACKGROUND) {
            console.log('TV: changed to background');
            const videoElement = getMediaElement();
            if (!videoElement) return;
            resetPlayer(videoElement);
        }

        if (appVisibilityState === AppVisibilityState.FOREGROUND) {
            console.log('TV: changed to foreground');
            const currentChannel = getCurrentChannel();
            currentChannel && !videoRef.current?.firstChild && updateStreamSource(currentChannel.getStreamUrl());
            focus();
        }
    }, [appVisibilityState]);

    return (
        <div
            id="tv-wrapper"
            ref={tvWrapper}
            tabIndex={-1}
            onKeyDown={handleKeyPress}
            onWheel={handleScrollWheel}
            onClick={handleClick}
            className="tv"
        >
            {channelNumberText !== '' && (
                <ChannelHeader channelNumberText={channelNumberText} unmount={() => setChannelNumberText('')} />
            )}

            {state === State.CHANNEL_SETTINGS && (
                <ChannelSettings
                    channelName={getCurrentChannel()?.getName() || ''}
                    audioTracks={audioTracksRef.current}
                    textTracks={textTracksRef.current}
                    unmount={() => setState(State.TV)}
                />
            )}

            {state === State.CHANNEL_INFO && (
                <ChannelInfo
                    unmount={() => {
                        setState(State.TV);
                        setChannelNumberText('');
                    }}
                />
            )}

            {state === State.CHANNEL_LIST && (
                <ChannelList
                    toggleRecording={(event: EPGEvent, callback: () => unknown) => toggleRecording(event, callback)}
                    onBack={() => setState(State.TV)}
                    onSelect={() => setState(State.CHANNEL_INFO)}
                />
            )}

            {state === State.EPG && (
                <TVGuide
                    toggleRecording={(event: EPGEvent, callback: () => unknown) => toggleRecording(event, callback)}
                    unmount={() => setState(State.CHANNEL_INFO)}
                />
            )}

            <video
                id="myVideo"
                ref={videoRef}
                width={getWidth()}
                height={getHeight()}
                preload="none"
                onLoadedMetadata={handleLoadedMetaData}
            ></video>
        </div>
    );
};

export default TV;
