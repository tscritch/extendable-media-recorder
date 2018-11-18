import { IMediaEncoder, IMediaFormatRecoder, IMediaRecorder, IMediaRecorderOptions } from '../interfaces';
import { TMediaRecorderConstructorFactory, TNativeMediaRecorder } from '../types';

export const createMediaRecorderConstructor: TMediaRecorderConstructorFactory = (encoders, nativeMediaRecorderConstructor) => {

    return class MediaRecorder implements IMediaRecorder {

        private _extendedEncoder: null | IMediaEncoder;

        private _extendedRecorder: null | IMediaFormatRecoder;

        private _listeners: null | Map<string, Set<Function>>;

        private _nativeMediaRecorder: null | TNativeMediaRecorder;

        private _stream: null | MediaStream;

        constructor (stream: MediaStream, options: IMediaRecorderOptions) {
            const { mimeType } = options;

            if ((nativeMediaRecorderConstructor !== null) &&
                    (mimeType === undefined || nativeMediaRecorderConstructor.isTypeSupported(mimeType))) {
                this._extendedEncoder = null;
                this._listeners = null;
                this._nativeMediaRecorder = new nativeMediaRecorderConstructor(stream, options);
                this._stream = null;
            } else if (mimeType !== undefined) {
                const extendedEncoder = encoders.find((encoder) => encoder.isTypeSupported(mimeType));

                if (extendedEncoder === undefined) {
                    throw new Error(''); // @todo
                }

                this._extendedEncoder = extendedEncoder;
                this._listeners = new Map();
                this._nativeMediaRecorder = null;
                this._stream = stream;
            } else {
                throw new Error(); // @todo
            }

            this._extendedRecorder = null;
        }

        public addEventListener (type: string, listener: (event: Event) => {}): void {
            if (this._nativeMediaRecorder !== null) {
                return this._nativeMediaRecorder.addEventListener(type, listener);
            }

            if (this._listeners === null) {
                throw new Error(); // @todo
            }

            const listenersOfType = this._listeners.get(type);

            if (listenersOfType !== undefined) {
                listenersOfType.add(listener);
            } else {
                this._listeners.set(type, new Set([ listener ]));
            }
        }

        public dispatchEvent (_: Event): boolean {
            return true;
        }

        public removeEventListener (type: string, listener: (event: Event) => {}): void {
            if (this._nativeMediaRecorder !== null) {
                return this._nativeMediaRecorder.removeEventListener(type, listener);
            }

            if (this._listeners === null) {
                throw new Error(); // @todo
            }

            const listenersOfType = this._listeners.get(type);

            if (listenersOfType !== undefined) {
                listenersOfType.delete(listener);

                if (listenersOfType.size === 0) {
                    this._listeners.delete(type);
                }
            }
        }

        public start (): void {
            if (this._nativeMediaRecorder !== null) {
                return this._nativeMediaRecorder.start();
            }

            if (this._extendedEncoder === null || this._stream === null) {
                throw new Error();
            }

            this._extendedRecorder = this._extendedEncoder.start(this._stream);
        }

        public stop (): void {
            if (this._nativeMediaRecorder !== null) {
                return this._nativeMediaRecorder.stop();
            }

            if (this._extendedRecorder === null) {
                throw new Error(); // @todo
            }

            this._extendedRecorder
                .stop()
                .then((arrayBuffer) => {
                    if (this._listeners === null) {
                        throw new Error(); // @todo
                    }

                    const listenersOfType = this._listeners.get('dataavailable');

                    if (listenersOfType) {
                        listenersOfType.forEach((listener) => listener({ data: arrayBuffer }));
                    }
                });
        }

        public static isTypeSupported (mimeType: string): boolean {
            return (nativeMediaRecorderConstructor !== null && nativeMediaRecorderConstructor.isTypeSupported(mimeType)) ||
                encoders.some((encoder) => encoder.isTypeSupported(mimeType));
        }

    };

};
