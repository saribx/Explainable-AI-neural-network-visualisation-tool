import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as d3 from "d3";

const ModelNetworkVisualizer = ({ visualizationData }) => {
    const svgRef = useRef(null);
    const nodeDiameter = 100; // Increased size for better visibility
    const minNodeSpacing = 80; // Increased vertical spacing
    const minLayerSpacing = 200; // Increased horizontal spacing

    function calculateDimensions(networkStructure) {
        const maxNeuronsInLayer = Math.max(...networkStructure.map(layer => layer.neurons));
        const totalLayers = networkStructure.length;
        const minWidth = totalLayers * minLayerSpacing;
        const minHeight = maxNeuronsInLayer * minNodeSpacing;
        return { minWidth, minHeight };
    }

    function createHistogram(data, radius) {
        // Filter out any non-numeric values
        const numericData = data.filter(d => typeof d === 'number' && !isNaN(d));

        // Create histogram layout
        const bins = d3.bin()
            .thresholds(15)(numericData);

        // Calculate domain for x scale with some padding
        const xDomain = d3.extent(numericData);
        const xPadding = (xDomain[1] - xDomain[0]) * 0.1;

        // Create scales
        const x = d3.scaleLinear()
            .domain([xDomain[0] - xPadding, xDomain[1] + xPadding])
            .range([-radius + 10, radius - 10]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([radius - 10, -radius + 10]);

        return { bins, x, y };
    }

    function drawHistogramInNode(g, node, radius) {
        if (!node.activations || node.activations.length === 0) return;

        const { bins, x, y } = createHistogram(node.activations, radius);

        // Create a group for the histogram
        const histogramG = g.append("g")
            .attr("transform", `translate(${node.x}, ${node.y})`);

        // Add clip path
        const clipId = `clip-${node.id}`;
        histogramG.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", radius);

        // Create histogram group with clip path
        const barsG = histogramG.append("g")
            .attr("clip-path", `url(#${clipId})`);

        // Draw axes
        // X-axis
        const xAxis = d3.axisBottom(x)
            .ticks(4)
            .tickSize(5);

        barsG.append("g")
            .attr("transform", `translate(0, ${radius - 10})`)
            .attr("class", "x-axis")
            .call(xAxis)
            .style("font-size", "8px");

        // Y-axis
        const yAxis = d3.axisLeft(y)
            .ticks(4)
            .tickSize(5);

        barsG.append("g")
            .attr("transform", `translate(${-radius + 10}, 0)`)
            .attr("class", "y-axis")
            .call(yAxis)
            .style("font-size", "8px");

        // Draw the bars
        barsG.selectAll("rect")
            .data(bins)
            .join("rect")
            .attr("x", d => x(d.x0) + 1)
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("y", d => y(d.length))
            .attr("height", d => Math.max(0, y(0) - y(d.length)))
            .attr("fill", "#4f9deb")
            .attr("opacity", 0.7);

        // Add circular border
        histogramG.append("circle")
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", "#333")
            .attr("stroke-width", "1.5px");
    }

    function initializeSVG() {
        const container = d3.select("#model-network-container");
        container.selectAll("*").remove();

        const containerWidth = container.node().getBoundingClientRect().width;
        const { minHeight } = calculateDimensions(visualizationData.model_structure);
        const containerHeight = Math.max(minHeight + 200, 800);

        const margin = {
            top: containerHeight * 0.15,
            right: containerWidth * 0.15,
            bottom: containerHeight * 0.15,
            left: containerWidth * 0.15
        };

        const svgElement = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        return {
            g: svgElement.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            width: containerWidth - margin.left - margin.right,
            height: containerHeight - margin.top - margin.bottom
        };
    }

    function createNetwork(networkStructure, activations, width, height) {
        const nodes = [];
        const links = [];
        const layerSpacing = width / (networkStructure.length - 1);

        networkStructure.forEach((layer, layerIndex) => {
            const nodeCount = layer.neurons;
            const ySpacing = height / (Math.max(nodeCount, 1) + 1);

            for (let i = 0; i < nodeCount; i++) {
                const nodeActivations = activations[layerIndex]?.[i] || [];
                nodes.push({
                    id: `${layerIndex}_${i}`,
                    x: layerIndex * layerSpacing,
                    y: (i + 1) * ySpacing,
                    layer: layerIndex,
                    layerName: layer.name,
                    activations: Array.isArray(nodeActivations) ? nodeActivations : [nodeActivations]
                });
            }
        });

        // Create links
        for (let layerIndex = 0; layerIndex < networkStructure.length - 1; layerIndex++) {
            const currentLayerNodes = nodes.filter(n => n.layer === layerIndex);
            const nextLayerNodes = nodes.filter(n => n.layer === layerIndex + 1);

            currentLayerNodes.forEach(source => {
                nextLayerNodes.forEach(target => {
                    links.push({
                        source: { x: source.x, y: source.y },
                        target: { x: target.x, y: target.y }
                    });
                });
            });
        }

        return { nodes, links };
    }

    function drawNetwork(data, g) {
        // Draw links first
        g.selectAll("path.link")
            .data(data.links)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", d => {
                const midX = (d.source.x + d.target.x) / 2;
                return `M ${d.source.x} ${d.source.y}
                        C ${midX} ${d.source.y},
                          ${midX} ${d.target.y},
                          ${d.target.x} ${d.target.y}`;
            })
            .style("stroke", "#999")
            .style("stroke-opacity", 0.2)
            .style("fill", "none")
            .style("stroke-width", "1.5px");

        // Draw histograms for each node
        data.nodes.forEach(node => {
            drawHistogramInNode(g, node, nodeDiameter / 2);
        });

        // Add layer labels
        const uniqueLabels = data.nodes.filter((node, index, self) =>
            index === self.findIndex(n => n.layer === node.layer)
        );

        g.selectAll("text.layer-label")
            .data(uniqueLabels)
            .enter()
            .append("text")
            .attr("class", "layer-label")
            .attr("x", d => d.x)
            .attr("y", -30)
            .text(d => d.layerName)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "14px");
    }

    useEffect(() => {
        if (visualizationData?.model_structure && visualizationData?.activations) {
            const { g, width, height } = initializeSVG();
            const networkData = createNetwork(
                visualizationData.model_structure,
                visualizationData.activations,
                width,
                height
            );
            drawNetwork(networkData, g);

            const handleResize = () => {
                const { g, width, height } = initializeSVG();
                const networkData = createNetwork(
                    visualizationData.model_structure,
                    visualizationData.activations,
                    width,
                    height
                );
                drawNetwork(networkData, g);
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [visualizationData]);

    return (
        <div className="model-network-visualization">
            <h3>Model Architecture Visualization</h3>
            <div id="model-network-container" className="nn-drawer-container" ref={svgRef}></div>
        </div>
    );
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
            PropTypes.oneOfType([
                PropTypes.number,
                PropTypes.string,
                PropTypes.arrayOf(PropTypes.number)
            ])
        ).isRequired
    }).isRequired
};

export default ModelNetworkVisualizer;