import 'core-js/stable';
import 'regenerator-runtime/runtime';

import ReactDOM from 'react-dom';
import App from './App';
import kind from '@enact/core/kind';
import ThemeDecorator from '@enact/sandstone/ThemeDecorator';
import { AppContextProvider } from './AppContext';

const AppBase = kind({
    name: 'App',
    render: () => (
        <AppContextProvider>
            <App />
        </AppContextProvider>
    )
});

const DecoratedApp = ThemeDecorator(AppBase);

ReactDOM.render(
    <DecoratedApp />,
    document.getElementById('root')
);
