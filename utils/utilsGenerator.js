const generateReceipt = (billData, printerSettings) => {
    const {
      invoiceNumber,
      clientName,
      clientContact,
      issueDate,
      items,
      subtotal,
      discount,
      gstAmount,
      grandTotal,
      paymentMethod,
      notes
    } = billData;
  
    const width = printerSettings.paperWidth === '58mm' ? 32 : 48;
    const separator = '='.repeat(width);
    const dash = '-'.repeat(width);
  
    const buffer = [];
  
    // Header
    buffer.push(centerText(process.env.BUSINESS_NAME || 'BillBazar Store', width));
    buffer.push(centerText(process.env.BUSINESS_ADDRESS || '123 Business Street', width));
    buffer.push(centerText(`Phone: ${process.env.BUSINESS_PHONE || '+91 9876543210'}`, width));
    buffer.push(centerText(`GST: ${process.env.BUSINESS_GST || 'N/A'}`, width));
    buffer.push(separator);
  
    // Receipt info
    const date = new Date(issueDate);
    const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    buffer.push(`Invoice: ${invoiceNumber}`);
    buffer.push(`Date: ${dateStr} Time: ${timeStr}`);
    buffer.push(`Customer: ${clientName}`);
    if (clientContact) {
      buffer.push(`Phone: ${clientContact}`);
    }
    buffer.push(separator);
  
    // Items header
    if (width <= 32) {
      buffer.push('Item                Qty  Amount');
    } else {
      buffer.push(formatLine('Item', 'Qty', 'Rate', 'Amount', width));
    }
    buffer.push(dash);
    
    // Items
    items.forEach(item => {
      if (width <= 32) {
        const name = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
        buffer.push(`${name.padEnd(20)} ${item.quantity.toString().padStart(3)} ${formatCurrency(item.totalPrice).padStart(7)}`);
      } else {
        const name = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
        buffer.push(
          `${name.padEnd(22)} ${item.quantity.toString().padStart(3)} ` +
          `${formatCurrency(item.unitPrice).padStart(8)} ${formatCurrency(item.totalPrice).padStart(10)}`
        );
      }
    });
  
    buffer.push(dash);
  
    // Totals
    buffer.push(formatTotalLine('Subtotal:', formatCurrency(subtotal), width));
    
    if (discount > 0) {
      buffer.push(formatTotalLine('Discount:', `-${formatCurrency(discount)}`, width));
    }
    
    if (gstAmount > 0) {
      buffer.push(formatTotalLine('GST (18%):', formatCurrency(gstAmount), width));
    }
    
    buffer.push(separator);
    buffer.push(formatTotalLine('TOTAL:', formatCurrency(grandTotal), width));
    buffer.push(formatTotalLine('Payment:', paymentMethod, width));
    buffer.push(separator);
  
    // Notes
    if (notes) {
      buffer.push('');
      buffer.push('Notes:');
      buffer.push(notes);
      buffer.push(separator);
    }
  
    // Footer
    buffer.push('');
    buffer.push(centerText('Thank you for your business!', width));
    buffer.push(centerText('Visit again soon', width));
    buffer.push('');
    buffer.push(centerText('Powered by BillBazar', width));
    buffer.push('');
  
    return buffer.join('\n');
  };
  
  const centerText = (text, width) => {
    if (text.length >= width) return text.substring(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  };
  
  const formatLine = (col1, col2, col3, col4, width) => {
    return `${col1.padEnd(22)} ${col2.padStart(3)} ${col3.padStart(8)} ${col4.padStart(10)}`;
  };
  
  const formatTotalLine = (label, value, width) => {
    const totalWidth = width - 2;
    const labelWidth = totalWidth - value.length;
    return `${label.padEnd(labelWidth)}${value.padStart(value.length)}`;
  };
  
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };
  
  module.exports = { generateReceipt };
  