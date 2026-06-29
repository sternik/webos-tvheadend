import Icon from '@enact/sandstone/Icon';
import Picker from '@enact/sandstone/Picker';
import React, { useEffect, useRef, useState } from 'react';
import StorageHelper from '../utils/StorageHelper';

const ChannelSettings = (props: {
    channelName: string;
    textTracks: TextTrackList | undefined;
    audioTracks: AudioTrackList | undefined;
    unmount: () => void;
}) => {
    const [textTracksDisplay, setTextTracksDisplay] = useState<string[]>([]);
    const [audioTracksDisplay, setAudioTracksDisplay] = useState<string[]>([]);

    const channelSettingsWrapper = useRef<HTMLDivElement>(null);
    const selectedAudioTrack = useRef(0);
    const selectedTextTrack = useRef(0);
    const timeoutReference = useRef<NodeJS.Timeout | null>(null);

    const handleTextChange = (event: { value: number }) => {
        updateAutomaticUnmount();
        setSelectedTextTrack(event.value);
        return false;
    };

    const handleAudioChange = (event: { value: number }) => {
        updateAutomaticUnmount();

        // enable new track
        if (props.audioTracks) {
            for (let i = 0; i < props.audioTracks.length; i++) {
                const audioTrack = props.audioTracks[i];
                audioTrack.enabled = event.value === i;
            }
        }
        setSelectedAudioTrack(event.value);

        // save selected audio track index for channel
        StorageHelper.setLastAudioTrackIndex(props.channelName, event.value);

        // do not pass this event further
        return false;
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyCode = event.keyCode;

        switch (keyCode) {
            case 13: // ok button
                // do not pass this event to parent
                event.stopPropagation();
                break;
            case 461: // back button
            case 405: // yellow button
            case 89: //'y'
                // do not pass this event to parent
                event.stopPropagation();
                props.unmount();
                break;
        }

    };

    const setSelectedAudioTrack = (index: number) => {
        selectedAudioTrack.current = index;
    };

    const setSelectedTextTrack = (index: number) => {
        selectedTextTrack.current = index;
    };

    const updateAutomaticUnmount = () => {
        timeoutReference.current && clearTimeout(timeoutReference.current);
        timeoutReference.current = setTimeout(() => props.unmount(), 7000);
    };

    const focus = () => {
        channelSettingsWrapper.current?.focus();
    };

    useEffect(() => {
        focus();

        if (props.audioTracks) {
            const tracks: string[] = [];
            for (let i = 0; i < props.audioTracks.length; i++) {
                tracks.push(props.audioTracks[i].language);
                if (props.audioTracks[i].enabled) setSelectedAudioTrack(i);
            }
            setAudioTracksDisplay(tracks);
        }

        if (props.textTracks) {
            const tracks: string[] = [];
            for (let i = 0; i < props.textTracks.length; i++) {
                tracks.push(props.textTracks[i].language);
            }
            setTextTracksDisplay(tracks);
        }

        updateAutomaticUnmount();

        return () => {
            timeoutReference.current && clearTimeout(timeoutReference.current);
        };
    }, []);

    return (
        <div
            id="channel-settings"
            ref={channelSettingsWrapper}
            tabIndex={-1}
            className="channelSettings"
            onKeyDown={handleKeyPress}
        >
            {audioTracksDisplay.length > 0 && (
                <>
                    <Icon>audio</Icon>
                    <Picker defaultValue={selectedAudioTrack.current} onChange={handleAudioChange} width="large">
                        {audioTracksDisplay}
                    </Picker>
                </>
            )}

            {textTracksDisplay.length > 0 && (
                <>
                    <Icon>sub</Icon>
                    <Picker defaultValue={selectedTextTrack.current} onChange={handleTextChange} width="large">
                        {textTracksDisplay}
                    </Picker>
                </>
            )}
        </div>
    );
};

export default ChannelSettings;
