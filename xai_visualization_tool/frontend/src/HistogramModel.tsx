import { useEffect, useRef, useState, type FC } from 'react';
import * as d3 from 'd3';
import './HistogramModel';

interface HistogramModalProps {
    data: number[];
    onClose: () => void;
}

export interface ExtendedHistogramBin extends d3.Bin {
    x0: number | null;
    x1: number | null;
    length: number;
}

const HistogramModel: FC<HistogramModalProps> = ({ data, onClose }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current || !data) return;
        d3.select(modalRef.current).selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = 500;
        const height = 350;

        const svg = d3.select(modalRef.current)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const histogram = d3.bin()
            .thresholds(20)(data) as ExtendedHistogramBin[];

        const xScale = d3.scaleLinear()
            .domain([histogram[0]?.x0 ?? 0, histogram[histogram.length - 1]?.x1 ?? 1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(histogram, (d: ExtendedHistogramBin) => d.length) ?? 0])
            .range([height, 0]);

        svg.selectAll('rect')
            .data(histogram)
            .enter()
            .append('rect')
            .attr('class', 'histogram-bar')
            .attr('x', (d: ExtendedHistogramBin) => xScale(d.x0 ?? 0))
            .attr('width', (d: ExtendedHistogramBin) => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
            .attr('y', (d: ExtendedHistogramBin) => yScale(d.length))
            .attr('height', (d: ExtendedHistogramBin) => height - yScale(d.length));

        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.format('.2f'));

        const yAxis = d3.axisLeft(yScale)
            .ticks(8);

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .append('text')
            .attr('x', width / 2)
            .attr('y', 35)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Value');

        svg.append('g')
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -height / 2)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Frequency');
    }, [data]);

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div className="histogram-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>&times;</button>
                <h2>Distribution</h2>
                <div ref={modalRef}></div>
            </div>
        </div>
    );
};

export default HistogramModel;