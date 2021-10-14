

export type DisconnectionReasonCode =  'TOKEN_INVALID' | 'UNDEFINED' | 'DISCONNECTED_BY_CLIENT' | 'VERSION_CODE_NOT_SUPPORTED' | 'WRONG_PROJECT_NAME';
export type Connection = 'CONNECTED_WITH_SUCCESS' | 'CONNECTION_IN_PROGRESS' | 'DISCONNECTED';
export type OnConnectionChangeListener = (connection:Connection) => void;
