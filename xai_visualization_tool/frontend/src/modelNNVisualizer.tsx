import {useEffect, useRef, useState, type FC} from 'react';
import * as d3 from 'd3';
import './modelNNVisualizer.css';
import {ExtendedHistogramBin} from './types';
import HistogramModel from './HistogramModel';

interface LayerStructure {
    name: string;
    neurons: number;
    layer_type: string;
}

interface VisualizationData {
    model_structure: LayerStructure[];
    activations: { values: number[][], targets: number[] }[];
    weight_matrices: number[][][];
}

interface NeuronData {
    x: number;
    y: number;
    values: number[];
    targets: number[];
    layerIndex: number;
    neuronIndex: number;
}

interface ConnectionData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    weight: number;
    sourceNeuron: number;
    targetNeuron: number;
}

const ModelNetworkVisualizer: FC<{ visualizationData: VisualizationData }> = ({visualizationData}) => {
    const containerRef = useRef(null);
    const [selectedNeuron, setSelectedNeuron] = useState<NeuronData | null>(null);
    const [showFilter, setShowFilter] = useState<'all' | 'positive' | 'negative'>('all');

    useEffect(() => {
        if (!visualizationData || !containerRef.current) return;

        d3.select(containerRef.current).selectAll("*").remove();

        const margin = {top: 200, right: 50, bottom: 50, left: 50};
        const width = 1200, height = 800, neuronRadius = 25;
        const weightColorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('max-width', '100%')
            .style('height', 'auto');

        const zoomGroup = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const createGradient = () => {
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', 'weight-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%');

            gradient.selectAll('stop')
                .data(d3.range(-1, 1.1, 0.1))
                .enter()
                .append('stop')
                .attr('offset', d => ((d + 1) * 50) + '%')
                .attr('stop-color', d => weightColorScale(d));
        };

        createGradient();

        const {model_structure, activations, weight_matrices} = visualizationData;
        const layerSpacing = width / (model_structure.length - 1);
        const neuronSpacingFactor = 2;

        const zoom = d3.zoom()
            .scaleExtent([0.5, 4])
            .on('zoom', (event) => {
                const {k} = event.transform;

                // Update links
                zoomGroup.selectAll('.network-link')
                    .attr('y1', (d: ConnectionData) => d.y1 * k)
                    .attr('y2', (d: ConnectionData) => d.y2 * k);

                // Update neuron groups
                zoomGroup.selectAll('.neuron-group')
                    .attr('transform', (d: NeuronData) => `translate(${d.x},${d.y * k})`);
            });

        svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

        const createConnections = () => {
            const connections: ConnectionData[] = [];

            model_structure.forEach((layer, i) => {
                if (i === model_structure.length - 1) return;

                const nextLayer = model_structure[i + 1];
                const currentY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;
                const nextY = (height / Math.max(nextLayer.neurons + 1, 2)) * neuronSpacingFactor;

                for (let sourceIdx = 0; sourceIdx < layer.neurons; sourceIdx++) {
                    for (let targetIdx = 0; targetIdx < nextLayer.neurons; targetIdx++) {
                        connections.push({
                            x1: i * layerSpacing,
                            y1: (sourceIdx + 0.5) * (currentY / neuronSpacingFactor),
                            x2: (i + 1) * layerSpacing,
                            y2: (targetIdx + 0.5) * (nextY / neuronSpacingFactor),
                            weight: weight_matrices[i]?.[targetIdx]?.[sourceIdx] || 0,
                            sourceNeuron: sourceIdx,
                            targetNeuron: targetIdx
                        });
                    }
                }
            });

            zoomGroup.selectAll('.network-link')
                .data(connections)
                .enter()
                .append('line')
                .attr('class', 'network-link')
                .attr('x1', d => d.x1)
                .attr('y1', d => d.y1)
                .attr('x2', d => d.x2)
                .attr('y2', d => d.y2)
                .style('stroke', d => weightColorScale(d.weight))
                .style('stroke-width', d => Math.abs(d.weight) * 3 + 0.5)
                .style('visibility', d => {
                    if (showFilter === 'all') return 'visible';
                    if (showFilter === 'positive' && d.weight > 0.3) return 'visible';
                    if (showFilter === 'negative' && d.weight < -0.3) return 'visible';
                    return 'hidden';
                });
        };

        const createNeurons = () => {
            model_structure.forEach((layer, layerIndex) => {
                const neuronY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;

                zoomGroup.append('text')
                    .attr('x', layerIndex * layerSpacing)
                    .attr('y', -80)
                    .attr('text-anchor', 'middle')
                    .text(layer.name);

                for (let i = 0; i < layer.neurons; i++) {
                    const neuronData: NeuronData = {
                        x: layerIndex * layerSpacing,
                        y: (i + 0.5) * (neuronY / neuronSpacingFactor),
                        values: activations[layerIndex]?.values?.[i] ?? [],
                        targets: activations[layerIndex]?.targets ?? [],
                        layerIndex,
                        neuronIndex: i
                    };

                    const group = zoomGroup.append('g')
                        .datum(neuronData)
                        .attr('class', 'neuron-group')
                        .attr('transform', d => `translate(${d.x},${d.y})`)
                        .style('cursor', 'pointer')
                        .on('click', (event, d) => {
                            event.stopPropagation();
                            setSelectedNeuron(d);
                        });

                    group.append('circle')
                        .attr('r', neuronRadius);

                    if (neuronData.values.length) {
                        const createHistogram = (data: number[], color: string) => {
                            const extent = d3.extent(data) as [number, number];
                            const bins = d3.bin()
                                .domain(extent)
                                .thresholds(8)(data);

                            const xScale = d3.scaleLinear()
                                .domain([bins[0]?.x0 ?? 0, bins[bins.length - 1]?.x1 ?? 1])
                                .range([-neuronRadius + 6, neuronRadius - 6]);

                            const yScale = d3.scaleLinear()
                                .domain([0, d3.max(bins, d => d.length) ?? 0])
                                .range([neuronRadius - 6, -neuronRadius + 6]);

                            group.selectAll(`.hist-${color}`)
                                .data(bins)
                                .enter()
                                .append('rect')
                                .attr('class', `histogram-bar hist-${color}`)
                                .attr('x', d => xScale(d.x0 ?? 0))
                                .attr('width', d => Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
                                .attr('y', d => yScale(d.length))
                                .attr('height', d => Math.max(0, yScale(0) - yScale(d.length)))
                                .style('fill', color)
                                .style('opacity', 0.6);
                        };

                        if (neuronData.targets.length) {
                            const class0Data = neuronData.values.filter((_, i) => neuronData.targets[i] === 0);
                            const class1Data = neuronData.values.filter((_, i) => neuronData.targets[i] === 1);

                            createHistogram(class0Data, 'red');
                            createHistogram(class1Data, 'blue');
                        }
                    }
                }
            });
        };

        createConnections();
        createNeurons();
    }, [visualizationData, showFilter]);

    return (
        <div className="model-network-visualization">
            <div ref={containerRef} className="network-container"/>
            {selectedNeuron && (
                <HistogramModel
                    data={{
                        values: selectedNeuron.values,
                        targets: selectedNeuron.targets
                    }}
                    onClose={() => setSelectedNeuron(null)}
                    layerIndex={selectedNeuron.layerIndex}
                    neuronIndex={selectedNeuron.neuronIndex}
                />
            )}
        </div>
    );
};

export default ModelNetworkVisualizer;