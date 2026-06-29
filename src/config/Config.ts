import FileServiceAdapter from '../luna/FileServiceAdapter';
import HttpProxyServiceAdapter from '../luna/HttpProxyServiceAdapter';
import LunaServiceAdapter from '../luna/LunaServiceAdapter';
import MockLunaServiceAdapter from '../mock/MockLunaServiceAdapter';
import MockHttpProxyServiceAdapter from '../mock/MockHttpProxyServiceAdapter';
import MockFileServiceAdapter from '../mock/MockFileServiceAdapter';

declare var __MOCK_SERVICE__: boolean;

const Config: Configuration = {
    lunaServiceAdapter: __MOCK_SERVICE__ ? new MockLunaServiceAdapter() : new LunaServiceAdapter(),
    httpProxyServiceAdapter: __MOCK_SERVICE__ ? new MockHttpProxyServiceAdapter() : new HttpProxyServiceAdapter(),
    fileServiceAdapter: __MOCK_SERVICE__ ? new MockFileServiceAdapter() : new FileServiceAdapter()
};

export default Config;
