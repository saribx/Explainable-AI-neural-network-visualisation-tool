import {useEffect, useRef, useState, type FC} from 'react';
import * as d3 from 'd3';
import './modelNNVisualizer.css';
import {ExtendedHistogramBin,} from './types';
import HistogramModel from './HistogramModel';

interface LayerStructure {
    name: string;
    neurons: number;
    layer_type: string;
}

interface VisualizationData {
    model_structure: LayerStructure[];
    activations: {
        values: number[][];
        targets: number[];
    }[];
    weight_matrices: number[][][];
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

interface NeuronData {
    x: number;
    y: number;
    values: number[];
    targets: number[];
    layerIndex: number;
    neuronIndex: number;
}

interface ModelNetworkVisualizerProps {
    visualizationData: VisualizationData;
    firstLayerData?: number[] | null;
}

// Viridis color mapping function
const getViridisColor = (value: number): string => {
    const colors = [
        [68, 1, 84],       // Dark purple
        [70, 50, 127],     // Purple
        [59, 82, 139],     // Blue
        [33, 144, 141],    // Teal
        [93, 201, 99],     // Green
        [253, 231, 37]     // Yellow
    ];

    const v = Math.max(0, Math.min(1, value));
    const numSegments = colors.length - 1;
    const segment = Math.min(Math.floor(v * numSegments), numSegments - 1);
    const segmentT = (v * numSegments) - segment;

    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    const r = Math.round(c1[0] + (c2[0] - c1[0]) * segmentT);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * segmentT);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * segmentT);

    return `rgb(${r}, ${g}, ${b})`;
};

const ModelNetworkVisualizer: FC<ModelNetworkVisualizerProps> = ({visualizationData, firstLayerData}) => {
    const containerRef = useRef(null);
    const [selectedNeuron, setSelectedNeuron] = useState<{
        values: number[];
        targets: number[];
        layerIndex: number;
        neuronIndex: number;
    } | null>(null);
    const [connectionFilter, setConnectionFilter] = useState({
        showAll: true,
        showPositive: false,
        showNegative: false
    });

    const weightColorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([1, -1]);

    useEffect(() => {
        if (!visualizationData || !containerRef.current) return;

        d3.select(containerRef.current).selectAll("*").remove();

        const margin = {top: 200, right: 50, bottom: 50, left: 100};  // Increased left margin
        const width = 1200;
        const height = 800;
        const neuronRadius = 25;
        const pixelSize = 15;  // Size of each input pixel
        const pixelGap = 2;    // Gap between pixels

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // First handle the input pixels if firstLayerData is available
        if (firstLayerData && firstLayerData.length === 64) {
            const pixelVerticalSpacing = Math.min(height / 64, 20);  // Space for 64 pixels, max 20px each
            const pixelGroup = g.append('g')
                .attr('class', 'input-pixels');

            firstLayerData.forEach((value, i) => {
                const yPos = i * pixelVerticalSpacing;
                pixelGroup.append('rect')
                    .attr('x', -40)  // Position pixels to the left of the first layer
                    .attr('y', yPos)
                    .attr('width', pixelSize)
                    .attr('height', pixelVerticalSpacing - pixelGap)
                    .attr('fill', getViridisColor(value))
                    .append('title')
                    .text(value.toFixed(2));

                // Add small value label
                pixelGroup.append('text')
                    .attr('x', -42)
                    .attr('y', yPos + (pixelVerticalSpacing - pixelGap) / 2)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-size', '8px')
                    .attr('fill', '#666')
                    .text(value.toFixed(2));

                // Add small value label
                pixelGroup.append('text')
                    .attr('x', -42)
                    .attr('y', yPos + (pixelVerticalSpacing - pixelGap) / 2)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-size', '8px')
                    .attr('fill', '#666')
                    .text(value.toFixed(2));
            });
        }

        const zoomGroup = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const legendWidth = 800;
        const legendHeight = 20;
        const legendX = (width - legendWidth) / 2;

        const legendScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format('.1f'));

        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'weight-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');

        gradient.selectAll('stop')
            .data(d3.range(-1, 1.1, 0.1))
            .enter()
            .append('stop')
            .attr('offset', (d) => ((d + 1) * 50) + '%')
            .attr('stop-color', (d) => weightColorScale(d));

        const filterControls = svg.append('g')
            .attr('class', 'filter-controls')
            .attr('transform', `translate(${legendX}, 50)`);

        filterControls.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .text('Show connections:')
            .style('font-size', '12px');

        const updateConnections = (newFilter: typeof connectionFilter) => {
            zoomGroup.selectAll('.network-link')
                .style('visibility', (d: ConnectionData) => {
                    if (newFilter.showAll) return 'visible';
                    if (newFilter.showPositive && d.weight > 0.5) return 'visible';
                    if (newFilter.showNegative && d.weight < -0.5) return 'visible';
                    return 'hidden';
                });
        };

        const totalWidth = 400;
        const startX = (legendWidth - totalWidth) / 2;
        
        //Options for strong positive, strong negative or all the connections of the neural network 
        const createOption = (x: number, label: string, checked: boolean, filterType: 'showAll' | 'showPositive' | 'showNegative') => {
            const option = filterControls.append('g')
                .attr('transform', `translate(${x}, -5)`)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    const newFilter = {
                        showAll: false,
                        showPositive: false,
                        showNegative: false,
                        [filterType]: true
                    };
                    setConnectionFilter(newFilter);
                    updateConnections(newFilter);

                    filterControls.selectAll('.filter-option')
                        .attr('fill', (d, i, nodes) => {
                            const optionType = nodes[i].getAttribute('data-type');
                            return newFilter[optionType as keyof typeof newFilter] ? '#2563eb' : '#666';
                        })
                        .attr('font-weight', (d, i, nodes) => {
                            const optionType = nodes[i].getAttribute('data-type');
                            return newFilter[optionType as keyof typeof newFilter] ? 'bold' : 'normal';
                        });
                });

            option.append('text')
                .attr('class', 'filter-option')
                .attr('data-type', filterType)
                .attr('x', 20)
                .attr('y', 10)
                .text(label)
                .attr('fill', checked ? '#2563eb' : '#666')
                .attr('font-weight', 'bold')
                .style('font-size', '14px')
                .style('letter-spacing', '0.5px');
        };

        createOption(startX, 'All', connectionFilter.showAll, 'showAll');
        createOption(startX + 140, 'Strong Positive', connectionFilter.showPositive, 'showPositive');
        createOption(startX + 300, 'Strong Negative', connectionFilter.showNegative, 'showNegative');

        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX},100)`);

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#weight-gradient)');

        legend.append('g')
            .attr('transform', `translate(0,${legendHeight})`)
            .call(legendAxis)
            .append('text')
            .attr('x', legendWidth / 2)
            .attr('y', 30)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Connection Weights');

        const {model_structure, activations, weight_matrices} = visualizationData;
        const layerSpacing = width / (model_structure.length - 1);
        const neuronSpacingFactor = 2;

        const zoom = d3.zoom()
            .scaleExtent([0.5, 4])
            .on('zoom', (event: d3.D3ZoomEvent) => {
                const transform = event.transform;
                zoomGroup.selectAll('.network-link')
                    .attr('y1', (d: ConnectionData) => d.y1 * transform.k)
                    .attr('y2', (d: ConnectionData) => d.y2 * transform.k);
                zoomGroup.selectAll('.neuron-group')
                    .attr('transform', (d: NeuronData) => `translate(${d.x},${d.y * transform.k})`);
            });

        svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

        const connections: ConnectionData[] = [];

        model_structure.forEach((layer, layerIndex) => {
            if (layerIndex < model_structure.length - 1) {
                const nextLayer = model_structure[layerIndex + 1];
                const neuronY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;
                const currentY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;
                const nextY = (height / Math.max(nextLayer.neurons + 1, 2)) * neuronSpacingFactor;
                const weightMatrix = weight_matrices[layerIndex] || [];

                for (let i = 0; i < layer.neurons; i++) {
                    for (let j = 0; j < nextLayer.neurons; j++) {
                        connections.push({
                            x1: layerIndex * layerSpacing,
                            y1: (i + 0.5) * (currentY / neuronSpacingFactor),
                            x2: (layerIndex + 1) * layerSpacing,
                            y2: (j + 0.5) * (nextY / neuronSpacingFactor),
                            weight: weightMatrix[j]?.[i] || 0,
                            sourceNeuron: i,
                            targetNeuron: j
                        });
                    }
                }
            }
        });

        zoomGroup.selectAll('.network-link')
            .data(connections)
            .enter()
            .append('line')
            .attr('class', 'network-link')
            .attr('x1', (d: ConnectionData) => d.x1)
            .attr('y1', (d: ConnectionData) => d.y1)
            .attr('x2', (d: ConnectionData) => d.x2)
            .attr('y2', (d: ConnectionData) => d.y2)
            .style('stroke', (d: ConnectionData) => weightColorScale(d.weight))
            .style('stroke-width', (d: ConnectionData) => Math.abs(d.weight) * 3 + 0.5)
            .style('visibility', (d: ConnectionData) => {
                if (connectionFilter.showAll) return 'visible';
                if (connectionFilter.showPositive && d.weight > 0.3) return 'visible';
                if (connectionFilter.showNegative && d.weight < -0.3) return 'hidden';
            })
            .append('title')
            .text((d: ConnectionData) => `Weight: ${d.weight.toFixed(3)}`);

        model_structure.forEach((layer: LayerStructure, layerIndex: number) => {
            const neuronY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;

            zoomGroup.append('text')
                .attr('class', 'layer-label')
                .attr('x', layerIndex * layerSpacing)
                .attr('y', -80)
                .attr('text-anchor', 'middle')
                .text(layer.name);

            for (let i = 0; i < layer.neurons; i++) {
                const neuronData: NeuronData = {
                    x: layerIndex * layerSpacing,
                    y: (i + 0.5) * (neuronY / neuronSpacingFactor),
                    values: (activations[layerIndex]?.values?.[i] ?? []) as number[],
                    targets: (activations[layerIndex]?.targets ?? []) as number[],
                    layerIndex: layerIndex,
                    neuronIndex: i
                };

                const neuronGroup = zoomGroup.append('g')
                    .datum(neuronData)
                    .attr('class', 'neuron-group')
                    .attr('transform', (d: NeuronData) => `translate(${d.x},${d.y})`)
                    .style('cursor', 'pointer')
                    .on('click', (event: MouseEvent, d: NeuronData) => {
                        event.stopPropagation();
                        setSelectedNeuron({
                            values: d.values,
                            targets: d.targets,
                            layerIndex: d.layerIndex,
                            neuronIndex: d.neuronIndex
                        });
                    });

                neuronGroup.append('circle')
                    .attr('class', 'network-node')
                    .attr('r', neuronRadius);

                const histData = neuronData.values;
                const extent = d3.extent(histData) as [number, number];
                const histogram = d3.bin()
                    .domain(extent)
                    .thresholds(8)(histData) as ExtendedHistogramBin[];

                const maxBinLength = d3.max(histogram, (d: ExtendedHistogramBin) => d.length) ?? 0;

                const xScale = d3.scaleLinear()
                    .domain([histogram[0]?.x0 ?? 0, histogram[histogram.length - 1]?.x1 ?? 1])
                    .range([-neuronRadius + 6, neuronRadius - 6]);

                const yScale = d3.scaleLinear()
                    .domain([0, maxBinLength])
                    .range([neuronRadius - 6, -neuronRadius + 6]);

                const histogramGroup = neuronGroup.append('g')
                    .attr('class', 'histogram-group');

                if (!neuronData.targets || neuronData.targets.length === 0) {
                    // No targets provided, single histogram for all data
                    histogramGroup.selectAll('rect')
                        .data(histogram)
                        .enter()
                        .append('rect')
                        .attr('class', 'histogram-bar')
                        .attr('x', (d: ExtendedHistogramBin) => xScale(d.x0 ?? 0))
                        .attr('width', (d: ExtendedHistogramBin) =>
                            Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
                        .attr('y', (d: ExtendedHistogramBin) => yScale(d.length))
                        .attr('height', (d: ExtendedHistogramBin) =>
                            Math.max(0, yScale(0) - yScale(d.length)))
                        .style('fill', 'blue')
                        .style('opacity', 0.6);
                } else {
                    // Targets provided, create separate histograms for each class
                    const class0Data = histData.filter((_, i) => neuronData.targets[i] === 0);
                    const class1Data = histData.filter((_, i) => neuronData.targets[i] === 1);
                
                    const hist0 = d3.bin()
                        .domain(extent)
                        .thresholds(8)(class0Data);
                    const hist1 = d3.bin()
                        .domain(extent)
                        .thresholds(8)(class1Data);
                
                    histogramGroup.selectAll('.class0-bar')
                        .data(hist0)
                        .enter()
                        .append('rect')
                        .attr('class', 'histogram-bar class0-bar')
                        .attr('x', (d: ExtendedHistogramBin) => xScale(d.x0 ?? 0))
                        .attr('width', (d: ExtendedHistogramBin) =>
                            Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
                        .attr('y', (d: ExtendedHistogramBin) => yScale(d.length))
                        .attr('height', (d: ExtendedHistogramBin) =>
                            Math.max(0, yScale(0) - yScale(d.length)))
                        .style('fill', 'red')
                        .style('opacity', 0.6);
                
                    histogramGroup.selectAll('.class1-bar')
                        .data(hist1)
                        .enter()
                        .append('rect')
                        .attr('class', 'histogram-bar class1-bar')
                        .attr('x', (d: ExtendedHistogramBin) => xScale(d.x0 ?? 0))
                        .attr('width', (d: ExtendedHistogramBin) =>
                            Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
                        .attr('y', (d: ExtendedHistogramBin) => yScale(d.length))
                        .attr('height', (d: ExtendedHistogramBin) =>
                            Math.max(0, yScale(0) - yScale(d.length)))
                        .style('fill', 'blue')
                        .style('opacity', 0.6);
                }
                    
            }
        });
    }, [visualizationData, firstLayerData]);

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