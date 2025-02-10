/* This file is for the page "Create NN" */
import React, {useState, useEffect} from 'react';
import * as d3 from 'd3';
import './NNdrawer.css'

/**
 * Represents the configuration for a neural network
 * Defines the structure of input, hidden, and output layers
 */
interface NetworkConfig {
    inputNodes: number;
    hiddenLayers: number[];
    outputNodes: number;
}

/**
 * NNdrawer Component
 *
 * Provides an interactive visualization and configuration interface
 * for creating and customizing a neural network architecture.
 *
 * Features:
 * - Dynamic addition of hidden layers (up to 5)
 * - Configurable number of input, hidden, and output nodes
 * - Real-time SVG visualization of network structure
 * - Responsive design with d3.js rendering
 */
const NNdrawer: React.FC = () => {
    // Initial network configuration with default values
    const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
        inputNodes: 4,
        hiddenLayers: [7, 5],
        outputNodes: 2
    });

    /**
     * Adds a new hidden layer to the network configuration
     * Limits the total number of hidden layers to 5
     */
    const addHiddenLayer = () => {
        if (networkConfig.hiddenLayers.length < 5) {
            setNetworkConfig(prev => ({
                ...prev,
                hiddenLayers: [...prev.hiddenLayers, 4]
            }));
        }
    };

    /**
     * Renders the neural network visualization using D3.js
     * Triggered on initial render and whenever network configuration changes
     *
     * Creates an SVG representation of the neural network:
     * - Dynamically calculates layer and node positioning
     * - Draws connections between nodes
     * - Handles responsive resizing
     */
    useEffect(() => {
        const drawNetwork = () => {
            const container = d3.select<HTMLDivElement, unknown>("#nn-drawer-container");
            container.selectAll("*").remove();

            const width = container.node()?.getBoundingClientRect().width ?? 0;
            const height = 600;
            const nodeRadius = 15;

            const svg = container.append<SVGSVGElement>("svg")
                .attr("width", width)
                .attr("height", height);

            const g = svg.append<SVGGElement>("g")
                .attr("transform", `translate(${width * 0.1}, ${height * 0.1})`);

            const layers = [
                networkConfig.inputNodes,
                ...networkConfig.hiddenLayers,
                networkConfig.outputNodes
            ];

            const actualWidth = width * 0.8;
            const actualHeight = height * 0.8;
            const layerSpacing = actualWidth / (layers.length - 1);

            // Create connections first (so they appear behind nodes)
            layers.forEach((nodeCount, layerIndex) => {
                if (layerIndex < layers.length - 1) {
                    const nextLayerNodes = layers[layerIndex + 1];
                    const currentY = actualHeight / (nodeCount + 1);
                    const nextY = actualHeight / (nextLayerNodes + 1);

                    for (let i = 0; i < nodeCount; i++) {
                        for (let j = 0; j < nextLayerNodes; j++) {
                            g.append<SVGLineElement>("line")
                                .attr("class", "network-link")
                                .attr("x1", layerIndex * layerSpacing)
                                .attr("y1", (i + 1) * currentY)
                                .attr("x2", (layerIndex + 1) * layerSpacing)
                                .attr("y2", (j + 1) * nextY);
                        }
                    }
                }
            });

            // Create nodes
            layers.forEach((nodeCount, layerIndex) => {
                const verticalSpacing = actualHeight / (nodeCount + 1);

                for (let i = 0; i < nodeCount; i++) {
                    g.append<SVGCircleElement>("circle")
                        .attr("class", "network-node")
                        .attr("cx", layerIndex * layerSpacing)
                        .attr("cy", (i + 1) * verticalSpacing)
                        .attr("r", nodeRadius);
                }
            });
        };

        drawNetwork();
        window.addEventListener('resize', drawNetwork);
        return () => window.removeEventListener('resize', drawNetwork);
    }, [networkConfig]);

    return (
        <div className="create-nn-container">
            <div className="nn-controls">
                <div className="nn-control-group">
                    <label>Input Nodes</label>
                    <input
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

                <div className="nn-control-group">
                    <label>Hidden Layers</label>
                    <div className="hidden-layers-group">
                        {networkConfig.hiddenLayers.map((nodes, idx) => (
                            <input
                                key={idx}
                                type="number"
                                value={nodes}
                                onChange={(e) => {
                                    const newLayers = [...networkConfig.hiddenLayers];
                                    newLayers[idx] = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                                    setNetworkConfig(prev => ({...prev, hiddenLayers: newLayers}));
                                }}
                                min="1"
                                max="15"
                            />
                        ))}
                        {networkConfig.hiddenLayers.length < 5 && (
                            <button
                                className="add-layer-btn"
                                onClick={addHiddenLayer}
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>

                <div className="nn-control-group">
                    <label>Output Nodes</label>
                    <input
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
            </div>

            <div id="nn-drawer-container" className="network-visualization"/>
        </div>
    );
};

export default NNdrawer;