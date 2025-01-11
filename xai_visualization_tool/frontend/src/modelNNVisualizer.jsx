import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import './modelNNVisualizer.css';

const HistogramModal = ({ data, onClose }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current || !data) return;

        d3.select(modalRef.current).selectAll("*").remove();

        // Angepasste Margins für bessere Platzierung
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = 500;
        const height = 350;

        // Create SVG with better sizing
        const svg = d3.select(modalRef.current)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create histogram with more bins for detail
        const histogram = d3.bin()
            .thresholds(20)(data);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([histogram[0].x0, histogram[histogram.length - 1].x1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(histogram, d => d.length)])
            .range([height, 0]);

        // Draw bars
        svg.selectAll('rect')
            .data(histogram)
            .enter()
            .append('rect')
            .attr('class', 'histogram-bar')
            .attr('x', d => xScale(d.x0))
            .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
            .attr('y', d => yScale(d.length))
            .attr('height', d => height - yScale(d.length));

        // Add axes with better formatting
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.format('.2f'));

        const yAxis = d3.axisLeft(yScale)
            .ticks(8);

        // Add X axis with label
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .append('text')
            .attr('x', width / 2)
            .attr('y', 35)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Activation Value');

        // Add Y axis with label
        svg.append('g')
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -height / 2)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Frequency');

    }, [data]);

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div className="histogram-modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>&times;</button>
                <h3>Neuron Activation Distribution</h3>
                <div ref={modalRef}></div>
            </div>
        </div>
    );
};

const ModelNetworkVisualizer = ({ visualizationData }) => {
    const containerRef = useRef(null);
    const [selectedNeuron, setSelectedNeuron] = useState(null);

    useEffect(() => {
        if (!visualizationData || !containerRef.current) return;

        // Clear previous visualization
        d3.select(containerRef.current).selectAll("*").remove();

        const margin = { top: 80, right: 50, bottom: 50, left: 50 };
        const width = 1200;
        const height = 800;
        const neuronRadius = 25;

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')  // Wichtig für Zentrierung und Skalierung
            .style('max-width', '100%')
            .style('height', 'auto');

        const zoomGroup = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const { model_structure, activations } = visualizationData;
        const layerSpacing = width / (model_structure.length - 1);
        const neuronSpacingFactor = 2;

        // Funktion zum Aktualisieren der Neuronenpositionen basierend auf dem Zoom-Level
        const updateNeuronPositions = (transform) => {
            const zoomLevel = transform.k;

            zoomGroup.selectAll('.network-link')
                .attr('x1', d => d.x1)
                .attr('y1', d => d.y1 * zoomLevel)
                .attr('x2', d => d.x2)
                .attr('y2', d => d.y2 * zoomLevel);

            zoomGroup.selectAll('.neuron-group')
                .attr('transform', d => `translate(${d.x},${d.y * zoomLevel})`);
        };

        // Zoom-Verhalten definieren
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                updateNeuronPositions(event.transform);
            });

        svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

        svg.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .attr('class', 'zoom-instruction')
            .text('Use mouse wheel to zoom in/out');

        // Create histogram function
        const createHistogram = (data, neuronRadius) => {
            const binCount = 8;
            const histGenerator = d3.bin()
                .domain(d3.extent(data))
                .thresholds(binCount);

            const bins = histGenerator(data);
            const maxBinLength = d3.max(bins, d => d.length);

            const xScale = d3.scaleLinear()
                .domain([bins[0].x0, bins[bins.length - 1].x1])
                .range([-neuronRadius + 6, neuronRadius - 6]);

            const yScale = d3.scaleLinear()
                .domain([0, maxBinLength])
                .range([neuronRadius - 6, -neuronRadius + 6]);

            return { bins, xScale, yScale };
        };

        // Verbindungen speichern
        const connections = [];
        model_structure.forEach((layer, layerIndex) => {
            if (layerIndex < model_structure.length - 1) {
                const nextLayer = model_structure[layerIndex + 1];
                const currentY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;
                const nextY = (height / Math.max(nextLayer.neurons + 1, 2)) * neuronSpacingFactor;

                for (let i = 0; i < layer.neurons; i++) {
                    for (let j = 0; j < nextLayer.neurons; j++) {
                        connections.push({
                            x1: layerIndex * layerSpacing,
                            y1: (i + 0.5) * (currentY / neuronSpacingFactor),
                            x2: (layerIndex + 1) * layerSpacing,
                            y2: (j + 0.5) * (nextY / neuronSpacingFactor)
                        });
                    }
                }
            }
        });

        // Draw connections
        zoomGroup.selectAll('.network-link')
            .data(connections)
            .enter()
            .append('line')
            .attr('class', 'network-link')
            .attr('x1', d => d.x1)
            .attr('y1', d => d.y1)
            .attr('x2', d => d.x2)
            .attr('y2', d => d.y2);

        // Draw layers
        model_structure.forEach((layer, layerIndex) => {
            const neuronY = (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;

            zoomGroup.append('text')
                .attr('class', 'layer-label')
                .attr('x', layerIndex * layerSpacing)
                .attr('y', -30)
                .text(layer.name);

            for (let i = 0; i < layer.neurons; i++) {
                const neuronGroup = zoomGroup.append('g')
                    .attr('class', 'neuron-group')
                    .datum({
                        x: layerIndex * layerSpacing,
                        y: (i + 0.5) * (neuronY / neuronSpacingFactor),
                        data: activations[layerIndex]?.[i] || []
                    })
                    .attr('transform', d => `translate(${d.x},${d.y})`)
                    .style('cursor', 'pointer')
                    .on('click', (event, d) => {
                        event.stopPropagation();
                        setSelectedNeuron(d.data);
                    });

                neuronGroup.append('circle')
                    .attr('class', 'network-node')
                    .attr('r', neuronRadius);

                if (activations[layerIndex] && activations[layerIndex][i]) {
                    const neuronData = activations[layerIndex][i];
                    const { bins, xScale, yScale } = createHistogram(neuronData, neuronRadius);

                    const histogramGroup = neuronGroup.append('g')
                        .attr('class', 'histogram-group');

                    histogramGroup.selectAll('rect')
                        .data(bins)
                        .enter()
                        .append('rect')
                        .attr('class', 'histogram-bar')
                        .attr('x', d => xScale(d.x0))
                        .attr('width', d => Math.max(2, xScale(d.x1) - xScale(d.x0) - 1))
                        .attr('y', d => yScale(d.length))
                        .attr('height', d => Math.max(0, yScale(0) - yScale(d.length)));

                    const xAxis = d3.axisBottom(xScale)
                        .ticks(3)
                        .tickSize(3);

                    const yAxis = d3.axisLeft(yScale)
                        .ticks(3)
                        .tickSize(3);

                    histogramGroup.append('g')
                        .attr('class', 'histogram-axis')
                        .attr('transform', `translate(0,${neuronRadius - 6})`)
                        .call(xAxis)
                        .selectAll('text')
                        .style('font-size', '6px');

                    histogramGroup.append('g')
                        .attr('class', 'histogram-axis')
                        .attr('transform', `translate(${-neuronRadius + 6},0)`)
                        .call(yAxis)
                        .selectAll('text')
                        .style('font-size', '6px');
                }
            }
        });

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

HistogramModal.propTypes = {
    data: PropTypes.arrayOf(PropTypes.number).isRequired,
    onClose: PropTypes.func.isRequired
};

ModelNetworkVisualizer.propTypes = {
    visualizationData: PropTypes.shape({
        model_structure: PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string.isRequired,
                neurons: PropTypes.number.isRequired,
                layer_type: PropTypes.string.isRequired
            })
        ).isRequired,
        activations: PropTypes.arrayOf(
            PropTypes.arrayOf(PropTypes.number)
        ).isRequired
    }).isRequired
};

export default ModelNetworkVisualizer;