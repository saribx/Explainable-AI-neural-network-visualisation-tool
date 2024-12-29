import { useEffect, useRef } from 'react';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import PropTypes from 'prop-types';
import './modelNNVisualizer.css';

const ModelNetworkVisualizer = ({ visualizationData }) => {
    const svgRef = useRef(null);
    const nodeDiameter = 45;
    const minNodeSpacing = 30;
    const minLayerSpacing = 100;

    function calculateDimensions(networkStructure) {
        const maxNeuronsInLayer = Math.max(...networkStructure.map(layer => layer.neurons));
        const totalLayers = networkStructure.length;

        // Calculate minimum dimensions needed
        const minWidth = totalLayers * minLayerSpacing;
        const minHeight = maxNeuronsInLayer * minNodeSpacing;

        return { minWidth, minHeight };
    }

    function initializeSVG() {
        const container = d3.select("#model-network-container");
        container.selectAll("*").remove();

        const containerWidth = container.node().getBoundingClientRect().width;
        const { minHeight } = calculateDimensions(visualizationData.model_structure);
        const containerHeight = Math.max(minHeight + 300, 600); // Increased minimum height to 600px

        const margin = {
            top: containerHeight * 0.1,
            right: containerWidth * 0.05,
            bottom: containerHeight * 0.1,
            left: containerWidth * 0.05
        };

        const svgElement = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block");

        return {
            g: svgElement.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            width: containerWidth - margin.left - margin.right,
            height: containerHeight - margin.top - margin.bottom
        };
    }

    function createNetwork(networkStructure, width, height) {
        const nodes = [];
        const links = [];
        const layerSpacing = width / (networkStructure.length - 1); // Gleichmäßiger Abstand

        networkStructure.forEach((layer, layerIndex) => {
            const nodeCount = layer.neurons;
            // Mehr Platz zwischen den Neuronen
            const ySpacing = height / (Math.max(nodeCount, 1) + 1);

            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    id: `${layerIndex}_${i}`,
                    x: layerIndex * layerSpacing,
                    y: (i + 1) * ySpacing,
                    layer: layerIndex,
                    layerName: layer.name
                });
            }
        });

        // Links zwischen den Schichten erstellen
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
        // Draw links with smooth curves
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
            .style("stroke-opacity", 0.3)
            .style("fill", "none")
            .style("stroke-width", "3px");

        // Draw nodes
        g.selectAll("circle")
            .data(data.nodes)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", nodeDiameter / 2)
            .style("fill", "#fff")
            .style("stroke", "#333")
            .style("stroke-width", "2px");

        // Add layer labels
        const uniqueLabels = data.nodes
            .filter((node, index, self) =>
                index === self.findIndex(n => n.layer === node.layer)
            );

        g.selectAll("text.layer-label")
            .data(uniqueLabels)
            .enter()
            .append("text")
            .attr("class", "layer-label")
            .attr("x", d => d.x)
            .attr("y", -20)
            .text(d => d.layerName)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "12px");
    }

    useEffect(() => {
        if (visualizationData?.model_structure) {
            const { g, width, height } = initializeSVG();
            const networkData = createNetwork(visualizationData.model_structure, width, height);
            drawNetwork(networkData, g);

            const handleResize = () => {
                const { g, width, height } = initializeSVG();
                const networkData = createNetwork(visualizationData.model_structure, width, height);
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
        ).isRequired
    }).isRequired
};

export default ModelNetworkVisualizer;