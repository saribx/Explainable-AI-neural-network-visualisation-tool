import {SimulationNodeDatum} from 'd3';

export interface ISettings {
    layers: {
        to_visualize: null | string[];
    };
}

export interface LayerStructure {
    name: string;
    neurons: number;
    layer_type: string;
    modules: string[] | undefined;
    activation_start: number;
}

export interface ConnectionData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    weight: number;
    sourceNeuron: number;
    targetNeuron: number;
}

export interface NeuronData extends SimulationNodeDatum {
    x: number;
    y: number;
    values: number[];
    targets: number[];
    layerIndex: number;
    neuronIndex: number;
}

export interface HistogramBin {
    x0: number | null;
    x1: number | null;
    length: number;
    x: number;
    y: number;
}

export interface ActivationData {
    values: number[][];
    targets: number[];
}

export interface VisualizationData {
    model_structure: LayerStructure[];
    activations: ActivationData[];
    weight_matrices: number[][][];
    node_node_matrices?: number[][][];
    weight_range: {
        min: number;
        max: number;
    };
    node_node_range?: {
        min: number;
        max: number;
    };
    layers: string[][];
}

export interface ConnectionFilter {
    showAll: boolean;
    showPositive: boolean;
    showNegative: boolean;
}

export interface LayerStructure {
    name: string;
    neurons: number;
    layer_type: string;
    modules: undefined | string[];
    activation_start: number;
}


export interface MatrixModalProps {
    data: number[];
    onClose: () => void;
    neuronIndex: number;
}

export type WeightSource = "model" | "node_node";