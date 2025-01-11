import { useState, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Neural Network Drawing Component
 * Allows users to create and visualize custom neural network architectures
 */
const NNdrawer = () => {
    const [networkConfig, setNetworkConfig] = useState({
        inputNodes: 4,
        hiddenLayers: [8],
        outputNodes: 2
    });

    const addHiddenLayer = () => {
        if (networkConfig.hiddenLayers.length < 5) {
            setNetworkConfig(prev => ({
                ...prev,
                hiddenLayers: [...prev.hiddenLayers, 8] // Default to 8 neurons
            }));
        }
    };

    const removeHiddenLayer = (index) => {
        if (networkConfig.hiddenLayers.length > 1) {
            setNetworkConfig(prev => ({
                ...prev,
                hiddenLayers: prev.hiddenLayers.filter((_, i) => i !== index)
            }));
        }
    };

    useEffect(() => {
        const drawNetwork = () => {
            // Clear previous visualization
            d3.select("#nn-drawer-container").selectAll("*").remove();

            // Setup dimensions
            const container = d3.select("#nn-drawer-container");
            const width = container.node().getBoundingClientRect().width;
            const height = 600;
            const margin = { top: 50, right: 50, bottom: 50, left: 50 };
            const nodeRadius = 15;

            // Create SVG
            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height);

            const g = svg.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            // Create network layout
            const layers = [
                networkConfig.inputNodes,
                ...networkConfig.hiddenLayers,
                networkConfig.outputNodes
            ];

            const layerSpacing = (width - margin.left - margin.right) / (layers.length - 1);
            const nodes = [];
            const links = [];

            // Create nodes
            layers.forEach((nodeCount, layerIndex) => {
                const verticalSpacing = (height - margin.top - margin.bottom) / (nodeCount + 1);

                for (let i = 0; i < nodeCount; i++) {
                    nodes.push({
                        id: `${layerIndex}-${i}`,
                        x: layerIndex * layerSpacing,
                        y: (i + 1) * verticalSpacing
                    });

                    // Create links to next layer
                    if (layerIndex < layers.length - 1) {
                        const nextLayerNodes = layers[layerIndex + 1];
                        for (let j = 0; j < nextLayerNodes; j++) {
                            links.push({
                                source: `${layerIndex}-${i}`,
                                target: `${layerIndex + 1}-${j}`
                            });
                        }
                    }
                }
            });

            // Draw links
            g.selectAll("line")
                .data(links)
                .join("line")
                .attr("class", "network-link")
                .attr("x1", d => nodes.find(n => n.id === d.source).x)
                .attr("y1", d => nodes.find(n => n.id === d.source).y)
                .attr("x2", d => nodes.find(n => n.id === d.target).x)
                .attr("y2", d => nodes.find(n => n.id === d.target).y);

            // Draw nodes
            g.selectAll("circle")
                .data(nodes)
                .join("circle")
                .attr("class", "network-node")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", nodeRadius);

            // Add layer labels
            const layerNames = [
                "Input Layer",
                ...networkConfig.hiddenLayers.map((_, i) => `Hidden Layer ${i + 1}`),
                "Output Layer"
            ];

            g.selectAll("text.layer-label")
                .data(layerNames)
                .join("text")
                .attr("class", "layer-label")
                .attr("x", (_, i) => i * layerSpacing)
                .attr("y", -20)
                .text(d => d)
                .attr("text-anchor", "middle");
        };

        drawNetwork();
        window.addEventListener('resize', drawNetwork);
        return () => window.removeEventListener('resize', drawNetwork);
    }, [networkConfig]);

    return (
        <div className="network-controls-layout">
            <div className="network-graph-container">
                <div id="nn-drawer-container" className="nn-drawer-container"></div>
            </div>
            <div className="network-controls-sidebar">
                <h3 className="controls-title">Network Parameters</h3>

                {/* Input nodes control */}
                <div className="control-group">
                    <label htmlFor="input-nodes">Input nodes:</label>
                    <input
                        id="input-nodes"
                        type="number"
                        value={networkConfig.inputNodes}
                        onChange={(e) => setNetworkConfig(prev => ({
                            ...prev,
                            inputNodes: Math.max(1, Math.min(15, parseInt(e.target.value) || 1))
                        }))}
                        min="1"
                        max="15"
                    />
                </div>

                {/* Hidden layer controls */}
                {networkConfig.hiddenLayers.map((nodes, idx) => (
                    <div className="control-group" key={idx}>
                        <label htmlFor={`hidden-nodes-${idx}`}>
                            Hidden Layer {idx + 1} nodes:
                        </label>
                        <div className="flex gap-2">
                            <input
                                id={`hidden-nodes-${idx}`}
                                type="number"
                                value={nodes}
                                onChange={(e) => {
                                    const newLayers = [...networkConfig.hiddenLayers];
                                    newLayers[idx] = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                                    setNetworkConfig(prev => ({ ...prev, hiddenLayers: newLayers }));
                                }}
                                min="1"
                                max="15"
                                className="flex-1"
                            />
                            {networkConfig.hiddenLayers.length > 1 && (
                                <button
                                    onClick={() => removeHiddenLayer(idx)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 rounded"
                                    title="Remove Layer"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Output nodes control */}
                <div className="control-group">
                    <label htmlFor="output-nodes">Output nodes:</label>
                    <input
                        id="output-nodes"
                        type="number"
                        value={networkConfig.outputNodes}
                        onChange={(e) => setNetworkConfig(prev => ({
                            ...prev,
                            outputNodes: Math.max(1, Math.min(15, parseInt(e.target.value) || 1))
                        }))}
                        min="1"
                        max="15"
                    />
                </div>

                {/* Add layer button */}
                {networkConfig.hiddenLayers.length < 5 && (
                    <button
                        onClick={addHiddenLayer}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                    >
                        Add Hidden Layer
                    </button>
                )}
            </div>
        </div>
    );
};

export default NNdrawer;