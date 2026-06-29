import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import EPGUtils from '../utils/EPGUtils';
import EPGEvent from '../models/EPGEvent';
import AppContext from '../AppContext';
import '../styles/app.css';

const TIME_VIEWPORT_MILLIS = 2 * 60 * 60 * 1000;
const TIME_LABEL_SPACING_MILLIS = 30 * 60 * 1000;
const CHANNEL_ROW_HEIGHT = 100;
const CHANNEL_SIDEBAR_WIDTH = 200;
const TIME_HEADER_HEIGHT = 80;
const DETAILS_HEIGHT = 260;
const VISIBLE_CHANNELS = 8;
const VERTICAL_SCROLL_TOP_PADDING = 3;

const TVGuide = (props: {
    toggleRecording: (event: EPGEvent, callback: () => unknown) => void;
    unmount: () => void;
}) => {
    const { locale, currentChannelPosition, epgData, setCurrentChannelPosition } = useContext(AppContext);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [focusedChannel, setFocusedChannel] = useState(currentChannelPosition);
    const [focusedEvent, setFocusedEvent] = useState<EPGEvent | null>(null);
    const [scrollX, setScrollX] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [closing, setClosing] = useState(false);
    const [tick, setTick] = useState(0);

    const scrollXRef = useRef(0);
    const scrollYRef = useRef(0);
    const focusedChannelRef = useRef(currentChannelPosition);

    const viewportWidth = window.innerWidth - CHANNEL_SIDEBAR_WIDTH;
    const viewportHeight = window.innerHeight - TIME_HEADER_HEIGHT - DETAILS_HEIGHT;
    const channelCount = epgData ? epgData.getChannelCount() : 0;
    const millisPerPixel = TIME_VIEWPORT_MILLIS / viewportWidth;
    const timeBase = EPGUtils.getNow() - TIME_VIEWPORT_MILLIS / 4;
    const timeLower = timeBase + scrollXRef.current * millisPerPixel;
    const timeUpper = timeLower + TIME_VIEWPORT_MILLIS;

    const doClose = useCallback(() => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => props.unmount(), 300);
    }, [closing, props.unmount]);

    const getXFromTime = (time: number) => (time - timeLower) / millisPerPixel;

    const getVisibleChannels = () => {
        const first = Math.max(0, Math.floor(scrollYRef.current / CHANNEL_ROW_HEIGHT) - 1);
        const last = Math.min(channelCount - 1, first + VISIBLE_CHANNELS + 2);
        const result = [];
        for (let i = first; i <= last; i++) {
            result.push(i);
        }
        return result;
    };

    const getVisibleEvents = (channelPos: number) => {
        const events = epgData?.getEvents(channelPos);
        if (!events) return [];
        const result: EPGEvent[] = [];
        for (const event of events) {
            if (event.getEnd() < timeLower) continue;
            if (event.getStart() > timeUpper) break;
            result.push(event);
        }
        return result;
    };

    const scrollToChannel = (pos: number) => {
        let target = pos * CHANNEL_ROW_HEIGHT;
        if (pos >= VERTICAL_SCROLL_TOP_PADDING) {
            target = CHANNEL_ROW_HEIGHT * (pos - VERTICAL_SCROLL_TOP_PADDING);
        } else {
            target = 0;
        }
        const maxScroll = Math.max(0, channelCount * CHANNEL_ROW_HEIGHT - viewportHeight);
        target = Math.min(target, maxScroll);
        scrollYRef.current = target;
        setScrollY(target);
    };

    const scrollToEvent = (event: EPGEvent) => {
        const eventCenter = (event.getStart() + event.getEnd()) / 2;
        const viewCenter = timeLower + TIME_VIEWPORT_MILLIS / 2;
        const diff = eventCenter - viewCenter;
        if (Math.abs(diff) > TIME_VIEWPORT_MILLIS / 4) {
            const newScrollX = scrollXRef.current + diff / millisPerPixel;
            scrollXRef.current = Math.max(0, newScrollX);
            setScrollX(scrollXRef.current);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        const keyCode = event.keyCode;

        switch (keyCode) {
            case 38: {
                event.stopPropagation();
                const newPos = focusedChannelRef.current > 0 ? focusedChannelRef.current - 1 : channelCount - 1;
                focusedChannelRef.current = newPos;
                setFocusedChannel(newPos);
                scrollToChannel(newPos);
                const ev = epgData?.getEventAtTimestamp(newPos, EPGUtils.getNow());
                setFocusedEvent(ev ?? null);
                break;
            }
            case 40: {
                event.stopPropagation();
                const newPos = focusedChannelRef.current < channelCount - 1 ? focusedChannelRef.current + 1 : 0;
                focusedChannelRef.current = newPos;
                setFocusedChannel(newPos);
                scrollToChannel(newPos);
                const ev = epgData?.getEventAtTimestamp(newPos, EPGUtils.getNow());
                setFocusedEvent(ev ?? null);
                break;
            }
            case 37: {
                event.stopPropagation();
                const ch = focusedChannelRef.current;
                const events = epgData?.getEvents(ch);
                if (!events || events.length === 0) break;
                const now = EPGUtils.getNow();
                let idx = events.findIndex(e => e.getStart() <= now && e.getEnd() > now);
                if (focusedEvent) {
                    idx = events.findIndex(e => e.getId() === focusedEvent.getId());
                    idx = Math.max(0, idx - 1);
                }
                const ev = events[idx] || events[0];
                setFocusedEvent(ev);
                scrollToEvent(ev);
                break;
            }
            case 39: {
                event.stopPropagation();
                const ch = focusedChannelRef.current;
                const events = epgData?.getEvents(ch);
                if (!events || events.length === 0) break;
                let idx = 0;
                if (focusedEvent) {
                    idx = events.findIndex(e => e.getId() === focusedEvent.getId());
                    idx = Math.min(events.length - 1, idx + 1);
                } else {
                    const now = EPGUtils.getNow();
                    idx = events.findIndex(e => e.getStart() <= now && e.getEnd() > now);
                    if (idx < 0) idx = 0;
                }
                const ev = events[idx] || events[0];
                setFocusedEvent(ev);
                scrollToEvent(ev);
                break;
            }
            case 13: {
                event.stopPropagation();
                setCurrentChannelPosition(focusedChannelRef.current);
                doClose();
                break;
            }
            case 403: {
                event.stopPropagation();
                if (focusedEvent) {
                    props.toggleRecording(focusedEvent, () => setTick(t => t + 1));
                }
                break;
            }
            case 461:
            case 406:
            case 66:
                event.stopPropagation();
                doClose();
                break;
            default:
                console.log('EPG-keyPressed:', keyCode);
        }
    };

    const handleScrollWheel = (event: React.WheelEvent) => {
        event.stopPropagation();
        if (event.deltaY < 0) {
            const newPos = focusedChannelRef.current > 0 ? focusedChannelRef.current - 1 : channelCount - 1;
            focusedChannelRef.current = newPos;
            setFocusedChannel(newPos);
            scrollToChannel(newPos);
        } else {
            const newPos = focusedChannelRef.current < channelCount - 1 ? focusedChannelRef.current + 1 : 0;
            focusedChannelRef.current = newPos;
            setFocusedChannel(newPos);
            scrollToChannel(newPos);
        }
        wrapperRef.current?.focus();
    };

    const handleClick = () => {
        setCurrentChannelPosition(focusedChannelRef.current);
        doClose();
    };

    const focus = () => wrapperRef.current?.focus();

    useEffect(() => {
        scrollToChannel(focusedChannelRef.current);
        const ev = epgData?.getEventAtTimestamp(focusedChannelRef.current, EPGUtils.getNow());
        setFocusedEvent(ev ?? null);
        focus();

        const handleWindowKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 461 || e.keyCode === 66 || e.keyCode === 406) {
                e.stopPropagation();
                doClose();
            }
        };
        window.addEventListener('keydown', handleWindowKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleWindowKeyDown, true);
        };
    }, [doClose]);

    if (!epgData || !epgData.hasData()) return null;

    const visibleChannels = getVisibleChannels();
    const now = EPGUtils.getNow();
    const nowX = getXFromTime(now);
    const timeLabels: number[] = [];
    const start = Math.ceil(timeLower / TIME_LABEL_SPACING_MILLIS) * TIME_LABEL_SPACING_MILLIS;
    for (let t = start; t <= timeUpper; t += TIME_LABEL_SPACING_MILLIS) {
        timeLabels.push(t);
    }

    const ch = focusedEvent ? epgData.getChannel(focusedChannel) : null;
    const isRec = focusedEvent ? epgData.isRecording(focusedEvent) : false;

    return (
        <div
            ref={wrapperRef}
            tabIndex={-1}
            onKeyDown={handleKeyPress}
            onWheel={handleScrollWheel}
            onClick={handleClick}
            className={`epg${closing ? ' closing' : ''}`}
        >
            {/* Time header */}
            <div className="epg-time-header">
                <div className="epg-day-label">
                    {EPGUtils.getWeekdayName(timeLower, locale)}
                </div>
                <div className="epg-time-labels" style={{ transform: `translateX(${-scrollX}px)` }}>
                    {timeLabels.map(t => (
                        <div
                            key={t}
                            className="epg-time-label"
                            style={{ left: `${getXFromTime(t) + CHANNEL_SIDEBAR_WIDTH}px` }}
                        >
                            {EPGUtils.toTimeString(t, locale)}
                        </div>
                    ))}
                </div>
                {nowX > 0 && nowX < viewportWidth && (
                    <div
                        className="epg-now-marker"
                        style={{ left: `${nowX + CHANNEL_SIDEBAR_WIDTH}px` }}
                    >
                        {EPGUtils.toTimeString(now, locale)}
                    </div>
                )}
            </div>

            {/* Content area */}
            <div className="epg-content">
                {/* Channel sidebar */}
                <div className="epg-channels">
                    <div style={{ transform: `translateY(${-scrollY}px)` }}>
                        {visibleChannels.map(pos => {
                            const ch = epgData.getChannel(pos);
                            if (!ch) return null;
                            const isFocused = pos === focusedChannel;
                            return (
                                <div
                                    key={ch.getChannelID()}
                                    className={`epg-channel${isFocused ? ' focused' : ''}`}
                                    style={{ top: `${pos * CHANNEL_ROW_HEIGHT}px` }}
                                >
                                    <div className="epg-ch-number">{ch.getChannelID()}</div>
                                    <div className="epg-ch-name">{ch.getName()}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Event grid */}
                <div className="epg-events-viewport">
                    <div
                        className="epg-events"
                        style={{
                            transform: `translate(${-scrollX}px, ${-scrollY}px)`,
                            minHeight: `${channelCount * CHANNEL_ROW_HEIGHT}px`
                        }}
                    >
                        {/* Horizontal grid lines */}
                        {visibleChannels.map(pos => (
                            <div
                                key={`line-${pos}`}
                                className="epg-grid-line"
                                style={{ top: `${pos * CHANNEL_ROW_HEIGHT}px` }}
                            />
                        ))}

                        {/* Events */}
                        {visibleChannels.map(pos => {
                            const events = getVisibleEvents(pos);

                            return events.map(ev => {
                                const isCurrent = ev.isCurrent();
                                const isFocused = focusedEvent?.getId() === ev.getId();
                                const isRec = epgData.isRecording(ev);
                                const left = getXFromTime(ev.getStart()) + CHANNEL_SIDEBAR_WIDTH;
                                const width = Math.max(2, (ev.getEnd() - ev.getStart()) / millisPerPixel);

                                let className = 'epg-event';
                                if (isCurrent) className += ' current';
                                if (isFocused) className += ' focused';
                                if (isRec) className += ' recording';

                                return (
                                    <div
                                        key={ev.getId()}
                                        className={className}
                                        style={{
                                            top: `${pos * CHANNEL_ROW_HEIGHT}px`,
                                            left: `${left}px`,
                                            width: `${width}px`
                                        }}
                                    >
                                        {isRec && <div className="epg-rec-bar" />}
                                        <span className="epg-event-title">{ev.getTitle()}</span>
                                    </div>
                                );
                            });
                        })}

                        {/* Now line */}
                        {nowX > -100 && nowX < viewportWidth + 100 && (
                            <div
                                className="epg-now-line"
                                style={{ left: `${nowX + CHANNEL_SIDEBAR_WIDTH}px` }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Details pane */}
            <div className="epg-details">
                {focusedEvent ? (
                    <div className="epg-details-content">
                        <div className="epg-details-left">
                            <div className="epg-details-channel">
                                {isRec && <span className="epg-rec-dot" />}
                                <span className="epg-details-ch-name">{ch?.getName()}</span>
                                <span className="epg-details-ch-num">#{ch?.getChannelID()}</span>
                            </div>
                            <div className="epg-details-title">{focusedEvent.getTitle()}</div>
                            {focusedEvent.getSubTitle() && (
                                <div className="epg-details-subtitle">{focusedEvent.getSubTitle()}</div>
                            )}
                            <div className="epg-details-time">
                                {EPGUtils.toTimeFrameString(focusedEvent.getStart(), focusedEvent.getEnd(), locale)}
                            </div>
                            {focusedEvent.getDescription() && (
                                <div className="epg-details-desc">{focusedEvent.getDescription()}</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="epg-details-empty">
                        Press OK to switch channel
                    </div>
                )}
            </div>
        </div>
    );
};

export default TVGuide;
