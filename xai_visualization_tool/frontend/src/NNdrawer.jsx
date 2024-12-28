// Adjustments in NNdrawer.jsx
import { useEffect, useState } from 'react';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function NeuralNetworkBuilder() {
    let svg, g;
    const nodeDiameter = 20;
    const nodeSpacing = 40;

    function initializeSVG() {
        d3.select("#nn-drawer-container").selectAll("*").remove();
        const container = d3.select("#nn-drawer-container");
        const containerHeight = 500; // Feste Höhe für bessere Kontrolle

        svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", containerHeight)
            .style("display", "block");

        // Zentriere die Visualisierung mit Margins
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
    }

    function createNetwork(inputNodes, hiddenNodesPerLayer, outputNodes) {
        const layers = [inputNodes, ...hiddenNodesPerLayer, outputNodes];
        const nodes = [];
        const links = [];

        // Berechne die verfügbare Breite für das Netzwerk
        const containerWidth = d3.select("#nn-drawer-container").node().getBoundingClientRect().width;
        const usableWidth = containerWidth - 100; // Margin berücksichtigen
        const layerSpacing = usableWidth / (layers.length - 1);

        let xOffset = 0;
        layers.forEach((nodeCount, layerIndex) => {
            const yOffset = (400 - nodeCount * nodeSpacing) / 2;
            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    id: `${layerIndex}_${i}`,
                    x: xOffset,
                    y: yOffset + i * nodeSpacing,
                    layer: layerIndex
                });
            }
            xOffset += layerSpacing;
        });

        // Create links between consecutive layers
        for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
            const currentLayerNodes = nodes.filter(n => n.layer === layerIndex);
            const nextLayerNodes = nodes.filter(n => n.layer === layerIndex + 1);

            currentLayerNodes.forEach(source => {
                nextLayerNodes.forEach(target => {
                    links.push({
                        source: {
                            x: source.x,
                            y: source.y
                        },
                        target: {
                            x: target.x,
                            y: target.y
                        }
                    });
                });
            });
        }

        return { nodes, links };
    }

    function drawNetwork(data) {
        g.selectAll("*").remove();

        // Draw links
        g.selectAll("line")
            .data(data.links)
            .enter()
            .append("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .style("stroke", "#999")
            .style("stroke-opacity", 0.6)
            .style("stroke-width", "1px");

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
        const labels = g.append("g")
            .attr("class", "labels")
            .attr("transform", "translate(0, -20)"); // Adjust this value to change the height

        labels.selectAll("text")
            .data(data.nodes.filter(n => n.id.endsWith("_0")))
            .enter()
            .append("text")
            .attr("x", d => d.x)
            .attr("y", 0)
            .text((d, i) => i === 0 ? "Input Layer" : i === data.nodes.filter(n => n.id.endsWith("_0")).length - 1 ? "Output Layer" : `Hidden Layer ${i}`)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold");
    }

    function build(inputNodes, hiddenNodesPerLayer, outputNodes) {
        initializeSVG();
        const networkData = createNetwork(inputNodes, hiddenNodesPerLayer, outputNodes);
        drawNetwork(networkData);
    }

    return { build };
}

function NNdrawer() {
    const [inputNodes, setInputNodes] = useState(4);
    const [hiddenLayers, setHiddenLayers] = useState(1);
    const [hiddenNodesPerLayer, setHiddenNodesPerLayer] = useState([8]);
    const [outputNodes, setOutputNodes] = useState(2);

    useEffect(() => {
        const builder = NeuralNetworkBuilder();
        builder.build(inputNodes, hiddenNodesPerLayer, outputNodes);

        const handleResize = () => {
            builder.build(inputNodes, hiddenNodesPerLayer, outputNodes);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [inputNodes, hiddenNodesPerLayer, outputNodes]);

    const handleInputChange = (setter) => (e) => {
        const value = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
        setter(value);
    };

    const handleHiddenLayersChange = (e) => {
        const value = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
        setHiddenLayers(value);
        setHiddenNodesPerLayer(prev => {
            const newArray = [...prev];
            while (newArray.length < value) {
                newArray.push(8); // Standardwert für neue Layer
            }
            return newArray.slice(0, value);
        });
    };

    const handleHiddenNodesChange = (index) => (e) => {
        const value = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
        setHiddenNodesPerLayer(prev => {
            const newArray = [...prev];
            newArray[index] = value;
            return newArray;
        });
    };

    return (
        <div className="network-controls-layout">
            <div className="network-graph-container">
                <div id="nn-drawer-container" className="nn-drawer-container"></div>
            </div>
            <div className="network-controls-sidebar">
                <h3 className="controls-title">Netzwerk Parameter</h3>
                <div className="control-group">
                    <label htmlFor="input-nodes">Eingabe-Knoten:</label>
                    <input
                        id="input-nodes"
                        type="number"
                        value={inputNodes}
                        onChange={handleInputChange(setInputNodes)}
                        min="1"
                        max="15"
                    />
                </div>
                <div className="control-group">
                    <label htmlFor="hidden-layers" style={{color: '#0000ff', fontWeight: 'bold'}}>Anzahl Hidden
                        Layers:</label> <input
                    id="hidden-layers"
                    type="number"
                        value={hiddenLayers}
                        onChange={handleHiddenLayersChange}
                        min="1"
                        max="5"
                    />
                </div>
                {hiddenNodesPerLayer.map((nodes, index) => (
                    <div className="control-group" key={index}>
                        <label htmlFor={`hidden-nodes-${index}`}>Hidden Layer {index + 1} Knoten:</label>
                        <input
                            id={`hidden-nodes-${index}`}
                            type="number"
                            value={nodes}
                            onChange={handleHiddenNodesChange(index)}
                            min="1"
                            max="15"
                        />
                    </div>
                ))}
                <div className="control-group">
                    <label htmlFor="output-nodes">Ausgabe-Knoten:</label>
                    <input
                        id="output-nodes"
                        type="number"
                        value={outputNodes}
                        onChange={handleInputChange(setOutputNodes)}
                        min="1"
                        max="15"
                    />
                </div>
            </div>
        </div>
    );
}

export default NNdrawer;