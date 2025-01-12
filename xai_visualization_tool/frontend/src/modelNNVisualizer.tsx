import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './modelNNVisualizer.css';

interface VisualizationData {
    model_structure: {
        name: string;
        neurons: number;
        layer_type: string;
    }[];
    activations: number[][];
}

interface HistogramModalProps {
    data: number[];
    onClose: () => void;
}

interface NeuronData {
    x: number;
    y: number;
    data: number[];
}

/**
 * Modal component for displaying activation distributions of individual neurons.
 * Shows a histogram of activation values with customizable bins and axes.
 */
const HistogramModal = ({ data, onClose }: HistogramModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!modalRef.current || !data) return;

        d3.select(modalRef.current).selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = 500;
        const height = 350;

        // Rest des HistogramModal Codes bleibt gleich, nur Typen werden hinzugefügt
        // ... (gleicher Code wie vorher)

    }, [data]);

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div className="histogram-modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>&times;</button>
                <h3>Neuron Activation Distribution</h3>
                <div ref={modalRef}></div>
            </div>
        </div>
    );
};

/**
 * Main visualization component for neural network structure and activations.
 * Displays network architecture with interactive neurons showing activation histograms.
 * Supports zooming and neuron selection for detailed activation analysis.
 */
const ModelNetworkVisualizer = ({ visualizationData }: { visualizationData: VisualizationData }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNeuron, setSelectedNeuron] = useState<number[] | null>(null);

    useEffect(() => {
        if (!visualizationData || !containerRef.current) return;

        const margin = { top: 80, right: 50, bottom: 50, left: 50 };
        const width = 1200;
        const height = 800;
        const neuronRadius = 25;

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('max-width', '100%')
            .style('height', 'auto');

        // ... (Rest des Visualization Codes bleibt gleich, nur Typen werden hinzugefügt)
        // Der Code bleibt weitgehend identisch, nur Typen für d3-Selektionen und Events werden ergänzt

    }, [visualizationData]);

    return (
        <div className="model-network-visualization">
            <div ref={containerRef} className="network-container" />
            {selectedNeuron && (
                <HistogramModal
                    data={selectedNeuron}
                    onClose={() => setSelectedNeuron(null)}
                />
            )}
        </div>
    );
};

export default ModelNetworkVisualizer;