import React, { useContext, useEffect, useReducer, useRef } from 'react';
import type EPGEvent from '../models/EPGEvent';
import EPGUtils from '../utils/EPGUtils';
import AppContext from '../AppContext';
import '../styles/app.css';

const ChannelInfo = (props: { unmount: () => void }) => {
    const { locale, epgData, currentChannelPosition } = useContext(AppContext);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [tick, forceUpdate] = useReducer(x => x + 1, 0);
    const [closing, setClosing] = React.useState(false);

    const channel = epgData ? epgData.getChannel(currentChannelPosition) : null;

    let currentEvent: EPGEvent | null = null;
    let nextEvent: EPGEvent | null = null;

    if (channel) {
        const events = channel.getEvents();
        for (const event of events) {
            if (event.isCurrent()) {
                currentEvent = event;
                continue;
            }
            if (currentEvent) {
                nextEvent = event;
                break;
            }
        }
    }

    const now = EPGUtils.getNow();
    const startTime = currentEvent ? EPGUtils.toTimeString(currentEvent.getStart(), locale) : '';
    const endTime = currentEvent ? EPGUtils.toTimeString(currentEvent.getEnd(), locale) : '';
    const runningTime = currentEvent ? EPGUtils.toDuration(currentEvent.getStart(), now) : '';
    const remainingMs = currentEvent ? currentEvent.getEnd() - now : 0;
    const remainingTime = Math.ceil(remainingMs / 1000 / 60);
    const doneFactor = currentEvent ? currentEvent.getDoneFactor() : 0;
    const isRecording = currentEvent ? epgData?.isRecording(currentEvent) : false;

    const doClose = React.useCallback(() => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => props.unmount(), 300);
    }, [closing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        resetTimeout();
        if (e.keyCode === 461 || e.keyCode === 13) {
            e.stopPropagation();
            doClose();
        }
    };

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(doClose, 5000);
    };

    useEffect(() => {
        wrapperRef.current?.focus();
        resetTimeout();

        const handleWindowKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 461 || e.keyCode === 13) {
                e.stopPropagation();
                doClose();
            }
        };
        window.addEventListener('keydown', handleWindowKeyDown, true);

        const interval = setInterval(() => {
            forceUpdate();
        }, 500);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            clearInterval(interval);
            window.removeEventListener('keydown', handleWindowKeyDown, true);
        };
    }, [currentChannelPosition]);

    if (!channel || !currentEvent) return null;

    return (
        <div
            ref={wrapperRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={`channelInfo${closing ? ' closing' : ''}`}
        >
            <div className="ci-content">
                <div className="ci-top">
                    <div className="ci-channel">
                        {isRecording && <span className="ci-recDot" />}
                        <span className="ci-channelName">{channel.getName()}</span>
                    </div>
                    <span className="ci-time">{EPGUtils.toTimeString(Date.now(), locale)}</span>
                </div>

                <div className="ci-title">
                    {currentEvent.getTitle()}
                </div>

                {currentEvent.getSubTitle() && (
                    <div className="ci-subtitle">{currentEvent.getSubTitle()}</div>
                )}

                <div className="ci-timeline">
                    <div className="ci-progress">
                        <div className="ci-progressBar" style={{ width: `${doneFactor * 100}%` }} />
                    </div>
                    <div className="ci-timelineLabels">
                        <span className="ci-tlStart">{startTime}</span>
                        <span className="ci-tlCenter">
                            <span className="ci-tlElapsed">{runningTime}</span>
                            {remainingTime > 0 && (
                                <span className="ci-tlRemaining">+{remainingTime}m</span>
                            )}
                        </span>
                        <span className="ci-tlEnd">{endTime}</span>
                    </div>
                </div>

                <div className="ci-bottom">
                    <div className="ci-keys">
                        <span className="ci-key ci-keyRec">● Rec</span>
                        <span className="ci-key ci-keyMenu">■ Menu</span>
                        <span className="ci-key ci-keyAudio">▶ Audio</span>
                        <span className="ci-key ci-keyEpg">≡ EPG</span>
                    </div>
                    {nextEvent && (
                        <div className="ci-next">
                            <span className="ci-nextLabel">Next:</span>
                            <span className="ci-nextTitle">{nextEvent.getTitle()}</span>
                            <span className="ci-nextTime">
                                {EPGUtils.toTimeString(nextEvent.getStart(), locale)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelInfo;
