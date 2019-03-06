export interface IFSAdapter {
    exists(file: string): Promise<boolean>;

    writeFile(file: string, data: string): Promise<void>;

    unlink(file: string): Promise<void>;

    readFile(file: string): Promise<string>;
}
