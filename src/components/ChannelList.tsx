import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppContext from '../AppContext';
import '../styles/app.css';
import ChannelListDetails from './ChannelListDetails';
import EPGEvent from '../models/EPGEvent';
import EPGChannel from '../models/EPGChannel';
import EPGUtils from '../utils/EPGUtils';

const CHANNEL_HEIGHT = 120;
const VERTICAL_SCROLL_TOP_PADDING_ITEM = 5;
const ROW_PADDING = 14;

enum State {
    NORMAL = 'normal',
    DETAILS = 'details'
}

interface DetailsState {
    focusedChannel?: EPGChannel;
    focusedEvent?: EPGEvent;
}

const ChannelList = (props: {
    toggleRecording: (event: EPGEvent, callback: () => unknown) => void;
    onBack: () => void;
    onSelect: () => void;
}) => {
    const { epgData, currentChannelPosition, setCurrentChannelPosition, isAnimationsEnabled, locale } = useContext(
        AppContext
    );
    const listWrapper = useRef<HTMLDivElement>(null);
    const channelPosRef = useRef(currentChannelPosition);
    const [channelPos, setChannelPos] = useState(currentChannelPosition);
    const [scrollOffset, setScrollOffset] = useState(0);
    const noAnimRef = useRef(true);
    const focusedEventOffset = useRef(0);
    const nextEvents = useRef<EPGEvent[]>([]);
    const nextSameEvents = useRef<EPGEvent[]>([]);

    const [state, setState] = useState<State>(State.NORMAL);
    const [detailsState, setDetailsState] = useState<DetailsState>();
    const [closing, setClosing] = useState(false);

    const doClose = React.useCallback((onDone: () => void) => {
        if (closing) return;
        setClosing(true);
        setTimeout(onDone, 300);
    }, [closing]);

    const scrollToChannelPosition = (position: number, withAnimation: boolean) => {
        const panelHeight = window.innerHeight - 120;
        const totalContent = channelCount * CHANNEL_HEIGHT + ROW_PADDING * 2;
        const maxTarget = Math.max(0, totalContent - panelHeight);

        let target = position * CHANNEL_HEIGHT;

        if (position >= VERTICAL_SCROLL_TOP_PADDING_ITEM) {
            target = CHANNEL_HEIGHT * (position - VERTICAL_SCROLL_TOP_PADDING_ITEM);
        } else {
            target = 0;
        }

        target = Math.min(target, maxTarget);

        noAnimRef.current = !withAnimation;
        setScrollOffset(target);
    };

    const recalculateAndRedraw = (withAnimation: boolean) => {
        if (epgData !== null && epgData.hasData()) {
            scrollToChannelPosition(channelPosRef.current, withAnimation);
        }
    };

    const focus = () => {
        listWrapper.current?.focus();
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyCode = event.keyCode;

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
                doClose(props.onBack);
                break;
            case 13:
                event.stopPropagation();
                setCurrentChannelPosition(channelPosRef.current);
                doClose(props.onSelect);
                break;
            case 82:
            case 403: {
                event.stopPropagation();
                toggleRecording();
                break;
            }
            case 39:
                event.stopPropagation();
                if (state === State.DETAILS) {
                    focusedEventOffset.current += 1;
                    setDetailsData();
                } else {
                    setState(State.DETAILS);
                }
                break;
            case 37:
                if (state === State.DETAILS) {
                    event.stopPropagation();
                    if (focusedEventOffset.current > 0) {
                        focusedEventOffset.current -= 1;
                        setDetailsData();
                    } else {
                        setState(State.NORMAL);
                    }
                }
                // in NORMAL state, let event bubble to TV.tsx for EPG
                break;
            default:
                console.log('ChannelList-keyPressed:', keyCode);
        }

        if (!event.isPropagationStopped) return event;
    };

    const toggleRecording = () => {
        const epgEvent =
            detailsState?.focusedEvent ||
            epgData
                .getChannel(channelPosRef.current)
                ?.getEvents()
                .find((e) => e.isCurrent());
        if (epgEvent) {
            props.toggleRecording(epgEvent, () => {
                setDetailsState({ ...detailsState });
            });
        }
    };

    const handleScrollWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.deltaY < 0 ? scrollUp() : scrollDown();
        focus();
    };

    const handleClick = () => {
        setCurrentChannelPosition(channelPosRef.current);
        doClose();
    };

    const scrollUp = () => {
        if (channelPosRef.current === 0) {
            setChannelPosition(epgData.getChannelCount() - 1);
        } else {
            setChannelPosition(channelPosRef.current - 1);
        }
    };

    const scrollDown = () => {
        if (channelPosRef.current === epgData.getChannelCount() - 1) {
            setChannelPosition(0);
        } else {
            setChannelPosition(channelPosRef.current + 1);
        }
    };

    const setChannelPosition = (position: number) => {
        channelPosRef.current = position;
        setChannelPos(position);
        if (state === State.DETAILS) {
            setDetailsData();
        }
        scrollToChannelPosition(position, isAnimationsEnabled);
    };

    const setDetailsData = () => {
        const channel = epgData.getChannel(channelPosRef.current);
        if (channel?.getChannelID() !== detailsState?.focusedChannel?.getChannelID()) {
            focusedEventOffset.current = 0;
        }

        const currentEvent = epgData.getEventAtTimestamp(channelPosRef.current, EPGUtils.getNow()) || undefined;
        let newFocusedEvent: EPGEvent | null = null;
        if (currentEvent) {
            const eventPos =
                epgData.getEventPosition(channelPosRef.current, currentEvent) + focusedEventOffset.current;
            const nextEventsArray: EPGEvent[] = [];
            for (let i = eventPos; i < eventPos + 5; i++) {
                const nextEvent = epgData.getEvent(channelPosRef.current, i + 1);
                nextEvent && nextEventsArray.push(nextEvent);
            }
            nextEvents.current = nextEventsArray;

            newFocusedEvent = epgData.getEvent(channelPosRef.current, eventPos);
        } else {
            nextEvents.current = [];
            nextSameEvents.current = [];
        }

        setDetailsState({
            focusedEvent: newFocusedEvent || undefined,
            focusedChannel: channel || undefined
        });
    };

    useEffect(() => {
        recalculateAndRedraw(false);
        focus();
    }, []);

    useLayoutEffect(() => {
        if (state === State.DETAILS) {
            setDetailsData();
        }
    }, [state]);

    const channelCount = epgData ? epgData.getChannelCount() : 0;

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
                            height: `${channelCount * CHANNEL_HEIGHT + ROW_PADDING * 2}px`,
                            transform: `translateY(${-scrollOffset}px)`,
                            transition: noAnimRef.current ? 'none' : 'transform 0.2s ease-out'
                        }}
                    >
                        {epgData && epgData.hasData() && (
                            <div>
                                {Array.from({ length: channelCount }, (_, i) => {
                                    const ch = epgData.getChannel(i);
                                    if (!ch) return null;
                                    const isSelected = i === channelPos;
                                    const event = epgData.getEventAtTimestamp(i, EPGUtils.getNow());
                                    const isRec = event ? epgData.isRecording(event) : false;
                                    let nextEvent: EPGEvent | null = null;
                                    if (event) {
                                        const eventPos = epgData.getEventPosition(i, event);
                                        nextEvent = epgData.getEvent(i, eventPos + 1);
                                    }
                                    return (
                                        <div
                                            key={ch.getChannelID()}
                                            className={`cl-row${isSelected ? ' selected' : ''}`}
                                            style={{ top: `${i * CHANNEL_HEIGHT + ROW_PADDING}px` }}
                                        >
                                            <div className="cl-number">{ch.getChannelID()}</div>
                                            <div className="cl-info">
                                                <div className="cl-name">
                                                    {isRec && <span className="cl-recDot" />}
                                                    {ch.getName()}
                                                </div>
                                                {event && (
                                                    <div className="cl-event">
                                                        <div className="cl-eventLine">
                                                            <div className="cl-progress">
                                                                <div
                                                                    className="cl-progressFill"
                                                                    style={{ width: `${event.getDoneFactor() * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="cl-eventTitle">{event.getTitle()}</span>
                                                        </div>
                                                        {nextEvent && (
                                                            <div className="cl-nextLine">
                                                                <span className="cl-nextArrow">Next</span>
                                                                <span className="cl-nextTitle">{nextEvent.getTitle()}</span>
                                                                <span className="cl-nextTime">
                                                                    {EPGUtils.toTimeString(nextEvent.getStart(), locale)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                    isRecording={(event: EPGEvent) => epgData.isRecording(event)}
                    epgChannel={detailsState?.focusedChannel}
                    currentEvent={detailsState?.focusedEvent}
                    nextEvents={nextEvents.current}
                    nextSameEvents={nextSameEvents.current}
                />
            )}
        </div>
    );
};

export default ChannelList;
