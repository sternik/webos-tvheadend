import React, { useContext, useEffect, useRef, useState } from 'react';

import ChannelSettings from './ChannelSettings';
import AppContext, { AppVisibilityState } from '../AppContext';
import '../styles/app.css';
import { AppViewState } from '../App';
import RecordingList from './RecordingList';
import EPGEvent from '../models/EPGEvent';
import EPGChannelRecording from '../models/EPGChannelRecording';
import { useVideoElement } from '../hooks/useVideoElement';

export enum State {
    PLAYER = 'player',
    PLAYER_INFO = 'playerInfo',
    RECORDINGS_LIST = 'recordingsList',
    RECORDINGS_SETTINGS = 'recordingSettings'
}

const Player = () => {
    const {
        persistentAuthToken,
        currentRecordingPosition,
        setCurrentRecordingPosition,
        menuState,
        appViewState,
        appVisibilityState,
        tvhDataService,
        epgData
    } = useContext(AppContext);

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

    const [recordings, setRecordings] = useState<EPGChannelRecording[]>([]);
    const [state, setState] = useState<State>(State.PLAYER);
    const tvWrapper = useRef<HTMLDivElement>(null);

    const focus = () => tvWrapper.current?.focus();
    const getCurrentChannel = () => recordings[currentRecordingPosition];

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (menuState || state === State.RECORDINGS_LIST) return;
        const keyCode = event.keyCode;

        switch (keyCode) {
            case 34:
                event.stopPropagation();
                if (currentRecordingPosition === 0) return;
                changeChannelPosition(currentRecordingPosition - 1);
                break;
            case 40:
                event.stopPropagation();
                setState(State.RECORDINGS_LIST);
                break;
            case 33:
                event.stopPropagation();
                if (currentRecordingPosition === recordings.length - 1) return;
                changeChannelPosition(currentRecordingPosition + 1);
                break;
            case 67:
            case 38:
                event.stopPropagation();
                setState(State.RECORDINGS_LIST);
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
            case 461:
                event.stopPropagation();
                setState(State.PLAYER);
                break;
            case 404:
            case 71:
                setState(State.PLAYER);
                break;
            default:
                console.log('Player-keyPressed:', keyCode);
        }
    };

    const handleChannelInfoSwitch = () => {
        state !== State.PLAYER_INFO ? setState(State.PLAYER_INFO) : setState(State.PLAYER);
    };

    const handleChannelSettingsSwitch = () => {
        if (!audioTracksRef.current && !textTracksRef.current) return;
        state !== State.RECORDINGS_SETTINGS ? setState(State.RECORDINGS_SETTINGS) : setState(State.PLAYER);
    };

    const handleScrollWheel = () => setState(State.RECORDINGS_LIST);
    const handleClick = () => handleChannelInfoSwitch();

    const deleteRecording = (event: EPGEvent) => {
        if (!event) return;
        if (event === getCurrentChannel()?.getEvents()[0]) {
            const vid = getMediaElement();
            vid && resetPlayer(vid);
            setCurrentRecordingPosition(-1);
        }
        tvhDataService?.deleteRec(event, (newrecordings) => setRecordings(newrecordings), persistentAuthToken);
    };

    const cancelRecording = (event: EPGEvent) => {
        if (!event) {
            return;
        }
        tvhDataService?.cancelRec(
            event,
            (newrecordings) => {
                setRecordings(newrecordings);
                epgData.updateRecordings(
                    newrecordings.filter((rec) => rec.getKind() === 'REC_UPCOMING').map((rec) => rec.getEvents()[0])
                );
            },
            persistentAuthToken
        );
    };

    const changeChannelPosition = (newChannelPosition: number) => {
        if (newChannelPosition === currentRecordingPosition) return;
        setCurrentRecordingPosition(newChannelPosition);
    };

    const handleLoadedMetaData = () => {
        const videoElement = getMediaElement();
        if (!videoElement) return;

        const audioTracks = videoElement.audioTracks;
        const textTracks = videoElement.textTracks;
        setAudioTracks(audioTracks);
        setTextTracks(textTracks);
    };

    const updateStreamSource = (streamUrl: URL) => {
        setState(State.PLAYER_INFO);
        changeSource(streamUrl, 'recording');
    };

    useEffect(() => {
        tvhDataService?.retrieveRecordings(persistentAuthToken).then((result) => {
            setRecordings(result);
            setState(State.RECORDINGS_LIST);
        });

        focus();

        return () => {
            const videoElement = getMediaElement();
            if (!videoElement) return;
            resetPlayer(videoElement);
            setCurrentRecordingPosition(-1);
        };
    }, []);

    useEffect(() => {
        if (recordings.length > 0) {
            const currentChannel = getCurrentChannel();
            if (currentChannel && currentChannel.getChannelID() !== currentRecordingPosition) {
                updateStreamSource(currentChannel.getStreamUrl());
            }
        }
    }, [currentRecordingPosition]);

    useEffect(() => {
        if (state === State.PLAYER) focus();
    }, [state]);

    useEffect(() => {
        if (appViewState === AppViewState.RECORDINGS) focus();
    }, [appViewState, menuState]);

    useEffect(() => {
        if (appVisibilityState === AppVisibilityState.FOCUSED) {
            console.log('Player: changed to focused');
            setState(State.PLAYER_INFO);
            focus();
        }

        if (appVisibilityState === AppVisibilityState.BACKGROUND) {
            console.log('Player: changed to background');
            const videoElement = getMediaElement();
            if (!videoElement) return;
            resetPlayer(videoElement);
        }

        if (appVisibilityState === AppVisibilityState.FOREGROUND) {
            console.log('Player: changed to foreground');
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
        >
            {state === State.RECORDINGS_SETTINGS && (
                <ChannelSettings
                    channelName={getCurrentChannel()?.getName() || ''}
                    audioTracks={audioTracksRef.current}
                    textTracks={textTracksRef.current}
                    unmount={() => setState(State.PLAYER)}
                />
            )}

            {state === State.RECORDINGS_LIST && (
                <RecordingList
                    deleteRecording={(event) => deleteRecording(event)}
                    cancelRecording={(event) => cancelRecording(event)}
                    recordings={recordings}
                    unmount={() => {
                        console.log('unmounting reclist');
                        setState(State.PLAYER);
                    }}
                />
            )}

            <video
                id="myVideo"
                ref={videoRef}
                width={getWidth()}
                height={getHeight()}
                preload="none"
                controls
                onLoadedMetadata={handleLoadedMetaData}
            ></video>
        </div>
    );
};

export default Player;
