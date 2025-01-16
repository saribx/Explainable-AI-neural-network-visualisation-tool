// types.ts
import * as d3 from 'd3';

export interface HistogramData {
    values: number[];
    targets: number[];
}

export interface HistogramModalProps {
    data: {
        values: number[];
        targets: number[];
    };
    onClose: () => void;
}

export type Bin = d3.Bin<number, number>;

export interface ExtendedHistogramBin extends Bin {
    x0: number | null;
    x1: number | null;
    length: number;
}