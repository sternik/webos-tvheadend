import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import EPGUtils from '../utils/EPGUtils';
import EPGEvent from '../models/EPGEvent';
import AppContext from '../AppContext';
import '../styles/app.css';

const TIME_VIEWPORT_MILLIS = 2 * 60 * 60 * 1000;
const TIME_LABEL_SPACING_MILLIS = 30 * 60 * 1000;
const CHANNEL_ROW_HEIGHT = 100;
const CHANNEL_SIDEBAR_WIDTH = 200;
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
    const focusedEventRef = useRef<EPGEvent | null>(null);

    const viewportWidth = window.innerWidth - CHANNEL_SIDEBAR_WIDTH;
    const viewportHeight = window.innerHeight - DETAILS_HEIGHT;
    const channelCount = epgData ? epgData.getChannelCount() : 0;
    const millisPerPixel = TIME_VIEWPORT_MILLIS / viewportWidth;
    const timeBase = EPGUtils.getNow() - TIME_VIEWPORT_MILLIS / 3;

    const doClose = useCallback(() => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => props.unmount(), 300);
    }, [closing, props.unmount]);

    const getXFromTime = (time: number) => (time - timeBase) / millisPerPixel;

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
        const tl = timeBase + scrollXRef.current * millisPerPixel;
        const tu = tl + TIME_VIEWPORT_MILLIS;
        const result: EPGEvent[] = [];
        for (const event of events) {
            if (event.getEnd() < tl) continue;
            if (event.getStart() > tu) break;
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
        const eventX = (eventCenter - timeBase) / millisPerPixel;
        const newScrollX = eventX - viewportWidth / 2;
        scrollXRef.current = newScrollX;
        setScrollX(newScrollX);
    };

    const getChannelEvents = (pos: number) => epgData?.getEvents(pos) ?? [];

    const moveUp = () => {
        if (channelCount === 0) return;
        const newPos = focusedChannelRef.current > 0 ? focusedChannelRef.current - 1 : channelCount - 1;
        focusedChannelRef.current = newPos;
        setFocusedChannel(newPos);
        scrollToChannel(newPos);
        const ev = epgData?.getEventAtTimestamp(newPos, EPGUtils.getNow());
        focusedEventRef.current = ev ?? null;
        setFocusedEvent(ev ?? null);
    };

    const moveDown = () => {
        if (channelCount === 0) return;
        const newPos = focusedChannelRef.current < channelCount - 1 ? focusedChannelRef.current + 1 : 0;
        focusedChannelRef.current = newPos;
        setFocusedChannel(newPos);
        scrollToChannel(newPos);
        const ev = epgData?.getEventAtTimestamp(newPos, EPGUtils.getNow());
        focusedEventRef.current = ev ?? null;
        setFocusedEvent(ev ?? null);
    };

    const moveLeft = () => {
        const events = getChannelEvents(focusedChannelRef.current);
        if (events.length === 0) return;
        const now = EPGUtils.getNow();
        const cur = focusedEventRef.current
            ? events.findIndex(e => e.getId() === focusedEventRef.current!.getId())
            : events.findIndex(e => e.getStart() <= now && e.getEnd() > now);
        const idx = cur > 0 ? cur - 1 : 0;
        const ev = events[idx];
        focusedEventRef.current = ev;
        setFocusedEvent(ev);
        scrollToEvent(ev);
    };

    const moveRight = () => {
        const events = getChannelEvents(focusedChannelRef.current);
        if (events.length === 0) return;
        let idx = 0;
        if (focusedEventRef.current) {
            const cur = events.findIndex(e => e.getId() === focusedEventRef.current!.getId());
            idx = cur < events.length - 1 ? cur + 1 : events.length - 1;
        }
        const ev = events[idx];
        focusedEventRef.current = ev;
        setFocusedEvent(ev);
        scrollToEvent(ev);
    };

    const handleSelect = () => {
        setCurrentChannelPosition(focusedChannelRef.current);
        doClose();
    };

    const handleToggleRec = () => {
        if (focusedEventRef.current) {
            props.toggleRecording(focusedEventRef.current, () => setTick(t => t + 1));
        }
    };

    const handleScrollWheel = (event: React.WheelEvent) => {
        event.stopPropagation();
        if (event.deltaY < 0) moveUp();
        else moveDown();
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
        focusedEventRef.current = ev ?? null;
        setFocusedEvent(ev ?? null);
        focus();

        const handleWindowKeyDown = (e: KeyboardEvent) => {
            let handled = true;
            switch (e.keyCode) {
                case 38: moveUp(); break;
                case 40: moveDown(); break;
                case 37: moveLeft(); break;
                case 39: moveRight(); break;
                case 13: handleSelect(); break;
                case 403: handleToggleRec(); break;
                case 461:
                case 406:
                case 66: handleSelect(); break;
                default: handled = false;
            }
            if (handled) {
                e.stopPropagation();
                e.preventDefault();
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
    const start = Math.ceil(timeBase / TIME_LABEL_SPACING_MILLIS) * TIME_LABEL_SPACING_MILLIS;
    for (let t = start; t <= timeBase + TIME_VIEWPORT_MILLIS; t += TIME_LABEL_SPACING_MILLIS) {
        timeLabels.push(t);
    }

    const focusedChData = focusedEvent ? epgData.getChannel(focusedChannel) : null;
    const isRec = focusedEvent ? epgData.isRecording(focusedEvent) : false;

    return (
        <div
            ref={wrapperRef}
            tabIndex={-1}
            onWheel={handleScrollWheel}
            onClick={handleClick}
            className={`epg${closing ? ' closing' : ''}`}
        >
            {/* Time header */}
            <div className="epg-time-header">
                <div className="epg-day-label">
                    {EPGUtils.getWeekdayName(timeBase + scrollX * millisPerPixel, locale)}
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
                                const isEventCurrent = ev.isCurrent();
                                const isEventFocused = focusedEvent?.getId() === ev.getId();
                                const isEventRec = epgData.isRecording(ev);
                                const left = getXFromTime(ev.getStart()) + CHANNEL_SIDEBAR_WIDTH;
                                const width = Math.max(2, (ev.getEnd() - ev.getStart()) / millisPerPixel);

                                let className = 'epg-event';
                                if (isEventCurrent) className += ' current';
                                if (isEventFocused) className += ' focused';
                                if (isEventRec) className += ' recording';

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
                                        {isEventRec && <div className="epg-rec-bar" />}
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
                                <span className="epg-details-ch-name">{focusedChData?.getName()}</span>
                                <span className="epg-details-ch-num">#{focusedChData?.getChannelID()}</span>
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
