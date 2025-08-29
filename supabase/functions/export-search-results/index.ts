// Edge Function: export-search-results
// Exportar resultados de búsqueda en múltiples formatos
// Formatos soportados: Excel, PDF, TXT

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('📥 [EXPORT-SEARCH-RESULTS] Iniciando exportación...');
        
        const requestData = await req.json();
        console.log('📦 Datos recibidos:', {
            hasResults: !!requestData?.results,
            resultsCount: requestData?.results?.length || 0,
            format: requestData?.format,
            hasMetadata: !!requestData?.search_metadata
        });
        
        const { results, format = 'txt', filename, search_metadata } = requestData;

        // Validaciones mejoradas
        if (!results) {
            throw new Error('Parámetro "results" requerido');
        }
        
        if (!Array.isArray(results)) {
            throw new Error('"results" debe ser un array');
        }
        
        if (results.length === 0) {
            console.log('⚠️ Array de resultados vacío, generando archivo vacío');
        }

        if (!['excel', 'pdf', 'txt'].includes(format)) {
            throw new Error('Formato no soportado. Use: excel, pdf, txt');
        }

        console.log(`📤 Exportando ${results.length} resultados en formato ${format}`);

        let exportData;
        let contentType;
        let fileExtension;

        try {
            switch (format) {
                case 'txt':
                    exportData = generateTextExport(results, search_metadata);
                    contentType = 'text/plain; charset=utf-8';
                    fileExtension = 'txt';
                    break;
                case 'excel':
                    exportData = generateExcelExport(results, search_metadata);
                    contentType = 'text/csv; charset=utf-8';
                    fileExtension = 'csv';
                    break;
                case 'pdf':
                    exportData = generatePDFExport(results, search_metadata);
                    contentType = 'application/pdf';
                    fileExtension = 'pdf';
                    break;
                default:
                    throw new Error(`Formato desconocido: ${format}`);
            }
        } catch (error) {
            console.error('❌ Error generando exportación:', error);
            throw new Error(`Error generando ${format}: ${error.message}`);
        }

        const finalFilename = filename || `convocatorias_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

        console.log('✅ Exportación completada exitosamente:', {
            format,
            filename: finalFilename,
            dataSize: exportData.length
        });

        return new Response(exportData, {
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${finalFilename}"`,
                'Content-Length': exportData.length.toString()
            }
        });

    } catch (error) {
        console.error('❌ ERROR en export-search-results:', error);
        console.error('❌ Stack trace:', error.stack);

        const errorResponse = {
            error: {
                code: 'EXPORT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString(),
                details: {
                    stack: error.stack?.split('\n').slice(0, 3).join('\n')
                }
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Generar exportación en formato texto
function generateTextExport(results: any[], metadata?: any): Uint8Array {
    try {
        let textContent = 'CONVOCATORIAS - REPORTE DE BÚSQUEDA\n';
        textContent += '='.repeat(50) + '\n\n';
        textContent += `Fecha de generación: ${new Date().toLocaleString('es-CL')}\n`;
        textContent += `Total de convocatorias: ${results.length}\n`;
        
        if (metadata?.search_id) {
            textContent += `ID de búsqueda: ${metadata.search_id}\n`;
        }
        
        textContent += '\n';
        
        if (results.length === 0) {
            textContent += 'No se encontraron resultados para exportar.\n';
        } else {
            results.forEach((result, index) => {
                textContent += `${index + 1}. ${result.title || 'Sin título'}\n`;
                textContent += `-`.repeat(30) + '\n';
                textContent += `Organización: ${result.validated_data?.organization || result.organization || 'No especificada'}\n`;
                textContent += `Descripción: ${(result.description || 'Sin descripción').substring(0, 200)}${result.description?.length > 200 ? '...' : ''}\n`;
                textContent += `Fecha límite: ${result.deadline || 'No especificada'}\n`;
                textContent += `Monto: ${result.amount || 'No especificado'}\n`;
                textContent += `Requisitos: ${(result.requirements || 'No especificados').substring(0, 150)}${result.requirements?.length > 150 ? '...' : ''}\n`;
                textContent += `Sitio web: ${result.source_url || 'No disponible'}\n`;
                textContent += `Categoría: ${result.validated_data?.category || 'General'}\n`;
                if (result.validated_data?.tags && result.validated_data.tags.length > 0) {
                    textContent += `Etiquetas: ${result.validated_data.tags.join(', ')}\n`;
                }
                textContent += '\n';
            });
        }
        
        textContent += '\n' + '='.repeat(50) + '\n';
        textContent += 'Generado por ConvocatoriasPro - https://convocatorias-pro.cl\n';
        
        return new TextEncoder().encode(textContent);
    } catch (error) {
        console.error('❌ Error en generateTextExport:', error);
        const fallback = `Error generando reporte de texto: ${error.message}\n\nContacte al soporte técnico.`;
        return new TextEncoder().encode(fallback);
    }
}

// Generar exportación en formato Excel (CSV compatible)
function generateExcelExport(results: any[], metadata?: any): Uint8Array {
    try {
        let csvContent = '\ufeffTítulo,Organización,Descripción,Fecha Límite,Monto,Requisitos,Sitio Web,Categoría,Etiquetas\n';
        
        if (results.length === 0) {
            csvContent += '"Sin resultados","","","","","","","",""\n';
        } else {
            results.forEach(result => {
                const cleanText = (text: string) => {
                    if (!text) return '';
                    return text.replace(/"/g, '""').replace(/[\r\n]/g, ' ').trim();
                };
                
                const row = [
                    `"${cleanText(result.title || '')}"`,
                    `"${cleanText(result.validated_data?.organization || result.organization || '')}"`,
                    `"${cleanText((result.description || '').substring(0, 200))}"`,
                    `"${result.deadline || ''}"`,
                    `"${cleanText(result.amount || '')}"`,
                    `"${cleanText((result.requirements || '').substring(0, 150))}"`,
                    `"${result.source_url || ''}"`,
                    `"${result.validated_data?.category || 'General'}"`,
                    `"${result.validated_data?.tags ? result.validated_data.tags.join(', ') : ''}"`
                ];
                csvContent += row.join(',') + '\n';
            });
        }
        
        return new TextEncoder().encode(csvContent);
    } catch (error) {
        console.error('❌ Error en generateExcelExport:', error);
        const fallback = `"Error","${error.message}","","","","","","",""\n`;
        return new TextEncoder().encode(fallback);
    }
}

// Generar exportación en formato PDF (HTML optimizado para PDF)
function generatePDFExport(results: any[], metadata?: any): Uint8Array {
    try {
        // Generar contenido HTML optimizado para conversión a PDF
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Convocatorias - Reporte PDF</title>
            <style>
                @media print {
                    body { margin: 0; }
                    .page-break { page-break-before: always; }
                }
                body { 
                    font-family: 'Arial', sans-serif; 
                    margin: 20px; 
                    line-height: 1.4; 
                    color: #333;
                    font-size: 12px;
                }
                h1 { 
                    color: #2c3e50; 
                    border-bottom: 3px solid #3498db; 
                    padding-bottom: 10px;
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .header-info {
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    border-left: 4px solid #3498db;
                }
                .convocatoria { 
                    margin-bottom: 30px; 
                    padding: 20px; 
                    border: 1px solid #e1e5e9; 
                    border-radius: 8px;
                    background-color: #ffffff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .title { 
                    font-size: 18px; 
                    font-weight: bold; 
                    color: #2c3e50; 
                    margin-bottom: 10px;
                    border-bottom: 1px solid #ecf0f1;
                    padding-bottom: 8px;
                }
                .organization { 
                    font-size: 14px; 
                    color: #7f8c8d; 
                    margin-bottom: 15px;
                    font-style: italic;
                }
                .detail { 
                    margin: 8px 0; 
                    font-size: 13px;
                    display: flex;
                    align-items: flex-start;
                }
                .label { 
                    font-weight: bold; 
                    color: #34495e;
                    min-width: 120px;
                    margin-right: 10px;
                }
                .value {
                    flex: 1;
                    word-break: break-word;
                }
                .footer { 
                    margin-top: 40px; 
                    text-align: center; 
                    color: #7f8c8d; 
                    border-top: 2px solid #ecf0f1; 
                    padding-top: 20px;
                    font-size: 11px;
                }
                .no-results { 
                    text-align: center; 
                    color: #7f8c8d; 
                    font-style: italic; 
                    padding: 60px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                }
                .tags {
                    display: inline-block;
                    background-color: #e3f2fd;
                    color: #1976d2;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    margin: 2px;
                }
                .urgent {
                    color: #d32f2f;
                    font-weight: bold;
                }
                .amount {
                    color: #2e7d32;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <h1>📄 Convocatorias - Reporte de Búsqueda</h1>
            
            <div class="header-info">
                <div class="detail">
                    <span class="label">Fecha de generación:</span>
                    <span class="value">${new Date().toLocaleString('es-CL')}</span>
                </div>
                <div class="detail">
                    <span class="label">Total de convocatorias:</span>
                    <span class="value">${results.length}</span>
                </div>
                ${metadata?.search_id ? `
                <div class="detail">
                    <span class="label">ID de búsqueda:</span>
                    <span class="value">${metadata.search_id}</span>
                </div>` : ''}
            </div>
        `;
        
        if (results.length === 0) {
            htmlContent += '<div class="no-results">📭 No se encontraron resultados para exportar.</div>';
        } else {
            results.forEach((result, index) => {
                const cleanHtml = (text: string) => {
                    if (!text) return 'No especificado';
                    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                };
                
                const formatDeadline = (deadline: string) => {
                    if (!deadline) return 'No especificada';
                    try {
                        const date = new Date(deadline);
                        const today = new Date();
                        const diffTime = date.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        let formatted = date.toLocaleDateString('es-CL');
                        if (diffDays < 0) {
                            formatted += ' <span class="urgent">(VENCIDA)</span>';
                        } else if (diffDays <= 30) {
                            formatted += ` <span class="urgent">(${diffDays} días restantes)</span>`;
                        } else {
                            formatted += ` (${diffDays} días restantes)`;
                        }
                        return formatted;
                    } catch {
                        return deadline;
                    }
                };
                
                htmlContent += `
                <div class="convocatoria">
                    <div class="title">${index + 1}. ${cleanHtml(result.title || 'Sin título')}</div>
                    
                    ${result.validated_data?.organization || result.organization ? 
                        `<div class="organization">🏢 ${cleanHtml(result.validated_data?.organization || result.organization || '')}</div>` : ''}
                    
                    ${result.description ? `
                    <div class="detail">
                        <span class="label">📋 Descripción:</span>
                        <span class="value">${cleanHtml((result.description || '').substring(0, 400))}${result.description?.length > 400 ? '...' : ''}</span>
                    </div>` : ''}
                    
                    <div class="detail">
                        <span class="label">📅 Fecha límite:</span>
                        <span class="value">${formatDeadline(result.deadline)}</span>
                    </div>
                    
                    ${result.amount ? `
                    <div class="detail">
                        <span class="label">💰 Monto:</span>
                        <span class="value amount">${cleanHtml(result.amount)}</span>
                    </div>` : ''}
                    
                    ${result.requirements ? `
                    <div class="detail">
                        <span class="label">📋 Requisitos:</span>
                        <span class="value">${cleanHtml((result.requirements || '').substring(0, 300))}${result.requirements?.length > 300 ? '...' : ''}</span>
                    </div>` : ''}
                    
                    ${result.source_url ? `
                    <div class="detail">
                        <span class="label">🔗 Sitio web:</span>
                        <span class="value">${result.source_url}</span>
                    </div>` : ''}
                    
                    <div class="detail">
                        <span class="label">🏷️ Categoría:</span>
                        <span class="value">${result.validated_data?.category || 'General'}</span>
                    </div>
                    
                    ${result.validated_data?.tags && result.validated_data.tags.length > 0 ? `
                    <div class="detail">
                        <span class="label">🏷️ Etiquetas:</span>
                        <span class="value">
                            ${result.validated_data.tags.map((tag: string) => `<span class="tags">${cleanHtml(tag)}</span>`).join('')}
                        </span>
                    </div>` : ''}
                    
                    ${result.validated_data?.reliability_score ? `
                    <div class="detail">
                        <span class="label">🤖 Confiabilidad IA:</span>
                        <span class="value">${result.validated_data.reliability_score}%</span>
                    </div>` : ''}
                </div>
                `;
                
                // Agregar salto de página cada 3 convocatorias para mejor distribución
                if ((index + 1) % 3 === 0 && index + 1 < results.length) {
                    htmlContent += '<div class="page-break"></div>';
                }
            });
        }
        
        htmlContent += `
            <div class="footer">
                <p><strong>📄 ConvocatoriasPro</strong></p>
                <p>Reporte generado automáticamente</p>
                <p>🌐 https://convocatorias-pro.cl</p>
                <p>📅 ${new Date().toLocaleString('es-CL')}</p>
            </div>
            
            <script>
                // Auto-abrir diálogo de impresión para conversión a PDF
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;
        
        return new TextEncoder().encode(htmlContent);
    } catch (error) {
        console.error('❌ Error en generatePDFExport:', error);
        const fallback = `
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
            <h1>Error al generar reporte PDF</h1>
            <p>Error: ${error.message}</p>
            <p>Contacte al soporte técnico.</p>
        </body>
        </html>`;
        return new TextEncoder().encode(fallback);
    }
}