import { Config } from '@remotion/cli/config';

// Sandbox proxy presents self-signed cert on outbound connections
// (only matters when fetching Google Fonts; we use local fonts here
// so this is belt-and-suspenders).
Config.setChromiumIgnoreCertificateErrors(true);
Config.setLogLevel('info');
