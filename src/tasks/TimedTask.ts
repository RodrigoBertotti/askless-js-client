

export abstract class TimedTask {
    private task:NodeJS.Timeout;

    protected constructor(public readonly taskName:string, protected _intervalInSeconds:number) {
        if(!this._intervalInSeconds)
            throw new Error("_intervalInSeconds is null/zero");
    }

    get intervalInSeconds() : number {
       return this._intervalInSeconds;
    }

    abstract run():void;
    protected onStop:VoidFunction = () =>{};
    protected onStart:VoidFunction = ()=>{};

    changeInterval(intervalInSeconds:number) {
        if(!intervalInSeconds){
            throw new Error("changeInterval: _intervalInSeconds is null/zero");
        }
        this._intervalInSeconds = intervalInSeconds;
        this.start();
    }

    start():void{
        this.stop();
        this.onStart();
        this.task = setInterval(async () => {
            await this.run();
        }, this._intervalInSeconds * 1000);
    }

    stop():void{
        if(this.task)
            clearInterval(this.task);
        this.onStop();
    }


}
