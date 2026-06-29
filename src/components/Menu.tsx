import React, { useLayoutEffect, useRef, useState } from 'react';
import '../styles/app.css';

export interface MenuItem {
    isActive: boolean;
    icon: string;
    label: string;
    action: () => void;
}

const Icons: Record<string, React.ReactNode> = {
    liveplayback: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 8v8l7-4z"/>
        </svg>
    ),
    recordings: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
        </svg>
    ),
    gear: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
    )
};

let focusedIndexRef = 0;

const Menu = (props: { items: MenuItem[]; unmount: () => void }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [, setTick] = useState(0);

    useLayoutEffect(() => {
        wrapperRef.current?.focus();
        const idx = props.items.findIndex(i => i.isActive);
        focusedIndexRef = idx >= 0 ? idx : 0;
        setTick(t => t + 1);
    }, []);

    useLayoutEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const count = props.items.length;
            if (count === 0) return;

            switch (e.keyCode) {
                case 38:
                case 33:
                    e.stopPropagation();
                    e.preventDefault();
                    focusedIndexRef = focusedIndexRef > 0 ? focusedIndexRef - 1 : count - 1;
                    setTick(t => t + 1);
                    break;
                case 40:
                case 34:
                    e.stopPropagation();
                    e.preventDefault();
                    focusedIndexRef = focusedIndexRef < count - 1 ? focusedIndexRef + 1 : 0;
                    setTick(t => t + 1);
                    break;
                case 13:
                    e.stopPropagation();
                    e.preventDefault();
                    props.items[focusedIndexRef]?.action();
                    break;
                case 461:
                case 67:
                    e.stopPropagation();
                    e.preventDefault();
                    props.unmount();
                    break;
            }
        };

        window.addEventListener('keydown', handler, true);

        return () => {
            window.removeEventListener('keydown', handler, true);
        };
    }, [props.items, props.unmount]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!(e.target as HTMLElement).closest('.menu-panel')) {
            props.unmount();
        }
    };

    return (
        <div
            ref={wrapperRef}
            tabIndex={-1}
            onClick={handleClick}
            className="menu"
        >
            <div className="menu-panel">
                {props.items.map((item, i) => (
                    <div
                        key={i}
                        className={`menu-item${item.isActive ? ' active' : ''}${focusedIndexRef === i ? ' focused' : ''}`}
                        onClick={(e) => { e.stopPropagation(); item.action(); }}
                    >
                        <span className="menu-label">{item.label}</span>
                        <span className="menu-icon">{Icons[item.icon]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Menu;
