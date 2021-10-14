


export type Level = 'info' | 'warning' | 'debug' | 'error';


export type LoggerFunction = (message:string, level?:Level, additionalData?:any) => void;
