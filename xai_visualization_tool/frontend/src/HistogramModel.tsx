import {useEffect, useRef, type FC} from 'react';
import * as d3 from 'd3';

interface HistogramModalProps {
    data: {
        values: number[];
        targets?: number[];
    };
    onClose: () => void;
    layerIndex?: number;
    neuronIndex?: number;
}

const HistogramModal: FC<HistogramModalProps> = ({data, onClose, layerIndex, neuronIndex}) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current || !data.values?.length) return;

        d3.select(modalRef.current).selectAll("*").remove();

        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = 500, height = 350;
        const svg = d3.select(modalRef.current)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const binCount = Math.ceil(Math.sqrt(data.values.length));
        const histogram = d3.bin().thresholds(binCount)(data.values);

        const xScale = d3.scaleLinear()
            .domain([d3.min(data.values) || 0, d3.max(data.values) || 1])
            .range([0, width])
            .nice();

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(histogram, d => d.length) || 0])
            .range([height, 0])
            .nice();

        if (data.targets?.length) {
            const [class0Data, class1Data] = [
                data.values.filter((_, i) => data.targets[i] === 0),
                data.values.filter((_, i) => data.targets[i] === 1)
            ];

            const [hist0, hist1] = [class0Data, class1Data].map(d =>
                d3.bin().domain(xScale.domain()).thresholds(binCount)(d)
            );

            svg.append('g')
                .attr('class', 'grid')
                .attr('opacity', 0.1)
                .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

            [
                {data: hist0, className: 'class0-bar', fill: 'red'},
                {data: hist1, className: 'class1-bar', fill: 'blue'}
            ].forEach(({data: histData, className, fill}) => {
                svg.selectAll(`.${className}`)
                    .data(histData)
                    .enter()
                    .append('rect')
                    .attr('class', `histogram-bar ${className}`)
                    .attr('x', d => xScale(d.x0 || 0))
                    .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
                    .attr('y', d => yScale(d.length))
                    .attr('height', d => height - yScale(d.length))
                    .style('fill', fill)
                    .style('opacity', 0.6);
            });

            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width - 100}, -10)`);

            [0, 1].forEach((classNum, i) => {
                legend.append('rect')
                    .attr('x', 0)
                    .attr('y', i * 20)
                    .attr('width', 12)
                    .attr('height', 12)
                    .attr('fill', classNum ? 'blue' : 'red')
                    .attr('opacity', 0.6);

                legend.append('text')
                    .attr('x', 20)
                    .attr('y', i * 20 + 9)
                    .attr('font-size', '12px')
                    .text(`Class ${classNum}`);
            });
        } else {
            svg.selectAll('.histogram-bar')
                .data(histogram)
                .enter()
                .append('rect')
                .attr('class', 'histogram-bar')
                .attr('x', d => xScale(d.x0 || 0))
                .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
                .attr('y', d => yScale(d.length))
                .attr('height', d => height - yScale(d.length))
                .style('fill', '#4f9deb')
                .style('opacity', 0.8);
        }

        const addAxis = (scale: any, position: string, label: string) => {
            const axis = position === 'bottom' ? d3.axisBottom(scale) : d3.axisLeft(scale);
            const g = svg.append('g')
                .attr('transform', position === 'bottom' ? `translate(0,${height})` : '')
                .call(axis);
            
            //positioning of the label of the axis is defined
            g.append('text')
                .attr('fill', '#666')
                .attr('text-anchor', 'middle')
                .text(label);

            if (position === 'bottom') {
                g.select('text')
                    .attr('x', width / 2)
                    .attr('y', 35);
            } else {
                g.select('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', -40)
                    .attr('x', -height / 2);
            }
        };

        addAxis(xScale, 'bottom', 'Activation Value');
        addAxis(yScale, 'left', 'Frequency');
    }, [data]);

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div className="histogram-modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close">×</button>
                <h2 className="modal-title">
                    Neuron Distribution
                    {layerIndex !== undefined && neuronIndex !== undefined &&
                        ` - Layer ${layerIndex}, Neuron ${neuronIndex}`}
                </h2>
                <div ref={modalRef} className="histogram-container"/>
            </div>
        </div>
    );
};

export default HistogramModal;