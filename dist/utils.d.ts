export declare function shortenUUID(uuid: string): string;
export declare function assumeType<T>(x: unknown): asserts x is T;
export declare function downloadFile(fileUrl: string, statusCallback?: (percentage: number) => void): Promise<Blob>;
