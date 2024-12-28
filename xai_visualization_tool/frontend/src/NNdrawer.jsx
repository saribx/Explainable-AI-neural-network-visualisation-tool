import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { useEffect } from 'react';

function NeuralNetworkBuilder() {
    let svg, g;
    const nodeDiameter = 20;
    const layerSpacing = 160;
    const nodeSpacing = 40;

    function initializeSVG() {
        d3.select("#nn-drawer-container").selectAll("*").remove();
        const container = d3.select("#nn-drawer-container");
        const width = container.node().getBoundingClientRect().width;
        const height = container.node().getBoundingClientRect().height;
        svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);
        g = svg.append("g");
    }

    function addZoom() {
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);
    }



    function createNetwork(inputNodes, hiddenNodes, outputNodes) {
        const layers = [inputNodes, hiddenNodes, outputNodes];
        const nodes = [];
        const links = [];

        let xOffset = 50;
        layers.forEach((nodeCount, layerIndex) => {
            const yOffset = (400 - nodeCount * nodeSpacing) / 2;
            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    id: `${layerIndex}_${i}`,
                    x: xOffset,
                    y: yOffset + i * nodeSpacing
                });
            }
            if (layerIndex < layers.length - 1) {
                const nextLayer = layers[layerIndex + 1];
                for (let i = 0; i < nodeCount; i++) {
                    for (let j = 0; j < nextLayer; j++) {
                        links.push({
                            source: `${layerIndex}_${i}`,
                            target: `${layerIndex + 1}_${j}`
                        });
                    }
                }
            }
            xOffset += layerSpacing;
        });

        return { nodes, links };
    }

    function drawNetwork(data) {
        g.selectAll("*").remove();

        g.selectAll("line")
            .data(data.links)
            .enter()
            .append("line")
            .attr("x1", d => data.nodes.find(n => n.id === d.source).x)
            .attr("y1", d => data.nodes.find(n => n.id === d.source).y)
            .attr("x2", d => data.nodes.find(n => n.id === d.target).x)
            .attr("y2", d => data.nodes.find(n => n.id === d.target).y)
            .style("stroke", "#999")
            .style("stroke-opacity", 0.6);

        g.selectAll("circle")
            .data(data.nodes)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", nodeDiameter / 2)
            .style("fill", "#fff")
            .style("stroke", "#333");
    }

    function build(inputNodes, hiddenNodes, outputNodes) {
        initializeSVG();
        const networkData = createNetwork(inputNodes, hiddenNodes, outputNodes);
        drawNetwork(networkData);
        addZoom();
    }
    return { build };
}

function NNdrawer() {
    useEffect(() => {
        const builder = NeuralNetworkBuilder();
        builder.build(6, 8, 2);
    }, []);

    return (
        <div id="nn-drawer-container" style={{ width: '100%', height: '600px' }}></div>
    );
}


export default NNdrawer;