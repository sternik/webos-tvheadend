import React, { useContext, useEffect, useRef, useState } from 'react';
import AppContext from '../AppContext';
import ChannelListDetails from './ChannelListDetails';
import EPGEvent from '../models/EPGEvent';
import EPGUtils from '../utils/EPGUtils';
import EPGChannelRecording from '../models/EPGChannelRecording';
import DialogPopup from './DialogPopup';
import '../styles/app.css';

const ROW_HEIGHT = 120;
const VERTICAL_SCROLL_TOP_PADDING_ITEM = 5;
const ROW_PADDING = 14;

enum State {
    NORMAL = 'normal',
    DETAILS = 'details',
    DELETE_DIALOG = 'deleteDialog',
    CANCEL_DIALOG = 'cancelDialog'
}

interface DetailsState {
    focusedChannelRecording?: EPGChannelRecording;
    focusedEvent?: EPGEvent;
}

const RecordingList = (props: {
    deleteRecording: (event: EPGEvent) => void;
    cancelRecording: (event: EPGEvent) => void;
    unmount: () => void;
    recordings: EPGChannelRecording[];
}) => {
    const { imageCache, currentRecordingPosition, setCurrentRecordingPosition, isAnimationsEnabled, locale } = useContext(AppContext);
    const listWrapper = useRef<HTMLDivElement>(null);
    const recordPosRef = useRef(currentRecordingPosition);
    const [recordPos, setRecordPos] = useState(currentRecordingPosition);
    const [scrollOffset, setScrollOffset] = useState(0);
    const noAnimRef = useRef(true);
    const [closing, setClosing] = useState(false);

    const [state, setState] = useState<State>(State.DETAILS);
    const [detailsState, setDetailsState] = useState<DetailsState>();

    const doClose = React.useCallback((onDone: () => void) => {
        if (closing) return;
        setClosing(true);
        setTimeout(onDone, 300);
    }, [closing]);

    const scrollToRecordPosition = (position: number, withAnimation: boolean) => {
        const panelHeight = window.innerHeight - 120;
        const totalContent = props.recordings.length * ROW_HEIGHT + ROW_PADDING * 2;
        const maxTarget = Math.max(0, totalContent - panelHeight);

        let target = position * ROW_HEIGHT;

        if (position >= VERTICAL_SCROLL_TOP_PADDING_ITEM) {
            target = ROW_HEIGHT * (position - VERTICAL_SCROLL_TOP_PADDING_ITEM);
        } else {
            target = 0;
        }

        target = Math.min(target, maxTarget);

        noAnimRef.current = !withAnimation;
        setScrollOffset(target);
    };

    const focus = () => {
        listWrapper.current?.focus();
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyCode = event.keyCode;

        if (state === State.DELETE_DIALOG || state === State.CANCEL_DIALOG) {
            return;
        }

        switch (keyCode) {
            case 33:
            case 38:
                event.stopPropagation();
                scrollUp();
                break;
            case 34:
            case 40:
                event.stopPropagation();
                scrollDown();
                break;
            case 67:
            case 461:
                event.stopPropagation();
                doClose(props.unmount);
                break;
            case 13:
                event.stopPropagation();
                setCurrentRecordingPosition(recordPosRef.current);
                doClose(props.unmount);
                break;
            case 82:
            case 403: {
                event.stopPropagation();
                if (detailsState?.focusedEvent) {
                    if (detailsState.focusedChannelRecording?.getKind() === 'REC_UPCOMING') {
                        setState(State.CANCEL_DIALOG);
                    } else {
                        setState(State.DELETE_DIALOG);
                    }
                }
                break;
            }
            default:
                console.log('RecordingList-keyPressed:', keyCode);
        }
    };

    const handleScrollWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.deltaY < 0 ? scrollUp() : scrollDown();
        focus();
    };

    const handleClick = () => {
        setCurrentRecordingPosition(recordPosRef.current);
        doClose(props.unmount);
    };

    const scrollUp = () => {
        if (recordPosRef.current === 0) {
            setRecordPosition(props.recordings.length - 1);
        } else {
            setRecordPosition(recordPosRef.current - 1);
        }
    };

    const scrollDown = () => {
        if (recordPosRef.current === props.recordings.length - 1) {
            setRecordPosition(0);
        } else {
            setRecordPosition(recordPosRef.current + 1);
        }
    };

    const setRecordPosition = (position: number) => {
        recordPosRef.current = position;
        setRecordPos(position);
        if (state === State.DETAILS) {
            setDetailsData();
        }
        scrollToRecordPosition(position, isAnimationsEnabled);
    };

    const setDetailsData = () => {
        const channel = props.recordings[recordPosRef.current];
        const currentEvent = channel?.getEvents()[0];
        setDetailsState({
            focusedEvent: currentEvent,
            focusedChannelRecording: channel
        });
    };

    const deleteRecording = (event: EPGEvent | undefined) => {
        if (!event) return;
        props.deleteRecording(event);
        setState(State.DETAILS);
        focus();
    };

    const cancelRecording = (event: EPGEvent | undefined) => {
        if (!event) return;
        props.cancelRecording(event);
        setState(State.DETAILS);
        focus();
    };

    useEffect(() => {
        if (currentRecordingPosition > -1) {
            setRecordPosition(currentRecordingPosition);
        }
        focus();
        if (props.recordings.length > 0) {
            setDetailsData();
        }
    }, []);

    const getKindColor = (kind: string) => {
        switch (kind) {
            case 'REC_FAILED': return '#EF3343';
            case 'REC_UPCOMING': return '#555555';
            default: return '#cccccc';
        }
    };

    return (
        <div
            ref={listWrapper}
            tabIndex={-1}
            onKeyDown={handleKeyPress}
            onWheel={handleScrollWheel}
            onClick={handleClick}
            className={`channelList${closing ? ' closing' : ''}`}
        >
            <div className="cl-panel">
                <div className="cl-scroll">
                    <div
                        style={{
                            height: `${props.recordings.length * ROW_HEIGHT + ROW_PADDING * 2}px`,
                            transform: `translateY(${-scrollOffset}px)`,
                            transition: noAnimRef.current ? 'none' : 'transform 0.2s ease-out'
                        }}
                    >
                        {props.recordings.length > 0 && (
                            <div>
                                {props.recordings.map((ch, i) => {
                                    const isSelected = i === recordPos;
                                    const event = ch.getEvents()[0];
                                    const kind = ch.getKind();
                                    const kindColor = getKindColor(kind);
                                    const imageURL = ch.getImageURL();
                                    const image = imageURL ? imageCache.get(imageURL) : undefined;
                                    return (
                                        <div
                                            key={ch.getChannelID()}
                                            className={`cl-row${isSelected ? ' selected' : ''}`}
                                            style={{ top: `${i * ROW_HEIGHT + ROW_PADDING}px` }}
                                        >
                                            <div className="cl-number">{ch.getChannelID()}</div>
                                            <div className="cl-info">
                                                {event && (
                                                    <div className="cl-name" style={{ color: kindColor }}>
                                                        {kind === 'REC_UPCOMING' && event.getStart() < EPGUtils.getNow() && (
                                                            <span className="cl-recDot" />
                                                        )}
                                                        {event.getTitle()}
                                                    </div>
                                                )}
                                                {event && (
                                                    <div className="cl-event">
                                                        <div className="cl-eventLine">
                                                            <div className="cl-progress">
                                                                <div
                                                                    className="cl-progressFill"
                                                                    style={{ width: `${event.getDoneFactor() * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="cl-eventTitle">{event.getSubTitle()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {image && (
                                                <div
                                                    style={{
                                                        width: `${ROW_HEIGHT * 1.3}px`,
                                                        height: `${ROW_HEIGHT}px`,
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <img
                                                        src={image.src}
                                                        alt=""
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '100%',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {state === State.DETAILS && (
                <ChannelListDetails
                    isRecording={() => false}
                    epgChannel={detailsState?.focusedChannelRecording}
                    currentEvent={detailsState?.focusedEvent}
                    nextEvents={[]}
                    nextSameEvents={[]}
                />
            )}

            {state === State.DELETE_DIALOG && detailsState?.focusedEvent && (
                <DialogPopup
                    title={detailsState.focusedEvent.getTitle()}
                    subtitle={detailsState.focusedEvent.getTitle() + ' - ' + detailsState.focusedEvent.getSubTitle()}
                    confirmText="Delete"
                    abortText="Abort"
                    confirmAction={() => deleteRecording(detailsState.focusedEvent)}
                    abortAcion={() => {
                        setState(State.DETAILS);
                        focus();
                    }}
                />
            )}

            {state === State.CANCEL_DIALOG && detailsState?.focusedEvent && (
                <DialogPopup
                    title={detailsState.focusedEvent.getTitle()}
                    subtitle={detailsState.focusedEvent.getTitle() + ' - ' + detailsState.focusedEvent.getSubTitle()}
                    confirmText="Cancel"
                    abortText="Abort"
                    confirmAction={() => cancelRecording(detailsState.focusedEvent)}
                    abortAcion={() => {
                        setState(State.DETAILS);
                        focus();
                    }}
                />
            )}
        </div>
    );
};

export default RecordingList;
