// Helper: Source Validation Integration
// Integrador automático de validación de fuentes para funciones de búsqueda

// Validar resultados de búsqueda automáticamente
export async function validateSearchResults(
    results: any[], 
    supabaseUrl: string, 
    serviceRoleKey: string,
    options: {
        enableAutoValidation?: boolean;
        maxConcurrent?: number;
        timeoutSeconds?: number;
    } = {}
): Promise<any[]> {
    
    const {
        enableAutoValidation = true,
        maxConcurrent = 2,
        timeoutSeconds = 8
    } = options;
    
    console.log(`🔍 Iniciando validación automática de ${results.length} resultados...`);
    
    // Si la validación está deshabilitada, retornar resultados sin validar
    if (!enableAutoValidation) {
        console.log('⚠️ Validación automática deshabilitada');
        return results.map(result => ({
            ...result,
            validation_status: 'not_validated',
            validation_notes: ['Validación automática deshabilitada']
        }));
    }
    
    // Filtrar resultados que tienen URLs válidas para validar
    const validatableResults = results.filter(result => 
        result.source_url && 
        result.source_url !== 'NO DISPONIBLE' && 
        (result.source_url.startsWith('http://') || result.source_url.startsWith('https://'))
    );
    
    const nonValidatableResults = results.filter(result => 
        !result.source_url || 
        result.source_url === 'NO DISPONIBLE' || 
        (!result.source_url.startsWith('http://') && !result.source_url.startsWith('https://'))
    ).map(result => ({
        ...result,
        validation_status: 'not_validatable',
        validation_notes: ['URL no válida o no disponible para validación'],
        reliability_score: Math.min(result.reliability_score || 50, 60)
    }));
    
    console.log(`🗺 ${validatableResults.length} resultados validables, ${nonValidatableResults.length} no validables`);
    
    if (validatableResults.length === 0) {
        return nonValidatableResults;
    }
    
    try {
        // Llamar al validador automático
        const validationResponse = await fetch(`${supabaseUrl}/functions/v1/validate-sources-auto`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                convocatorias: validatableResults,
                max_concurrent: maxConcurrent,
                timeout_seconds: timeoutSeconds
            })
        });
        
        if (!validationResponse.ok) {
            throw new Error(`Validador respondió con error: ${validationResponse.status}`);
        }
        
        const validationData = await validationResponse.json();
        
        if (validationData.error) {
            throw new Error(validationData.error.message);
        }
        
        const validatedResults = validationData.data.validated_convocatorias;
        const summary = validationData.data.validation_summary;
        
        console.log(`✅ Validación completada: ${summary.verified} verificadas, ${summary.partial} parciales, ${summary.failed} fallidas`);
        
        // Combinar resultados validados con no validables
        const allResults = [...validatedResults, ...nonValidatableResults];
        
        // Ordenar por reliability_score descendente
        allResults.sort((a, b) => (b.reliability_score || 0) - (a.reliability_score || 0));
        
        return allResults;
        
    } catch (error) {
        console.error('❌ Error en validación automática:', error);
        
        // En caso de error, retornar resultados originales con nota de error
        return results.map(result => ({
            ...result,
            validation_status: 'validation_failed',
            validation_notes: [`Error en validación: ${error.message}`],
            reliability_score: Math.min(result.reliability_score || 50, 70)
        }));
    }
}

// Validar un solo resultado (para uso individual)
export async function validateSingleResult(
    result: any,
    supabaseUrl: string,
    serviceRoleKey: string
): Promise<any> {
    
    const validated = await validateSearchResults(
        [result], 
        supabaseUrl, 
        serviceRoleKey, 
        { maxConcurrent: 1, timeoutSeconds: 10 }
    );
    
    return validated[0] || result;
}

// Obtener configuración de validación desde variables de entorno
export function getValidationConfig() {
    return {
        enableAutoValidation: Deno.env.get('ENABLE_SOURCE_VALIDATION') !== 'false',
        maxConcurrent: parseInt(Deno.env.get('VALIDATION_MAX_CONCURRENT') || '2'),
        timeoutSeconds: parseInt(Deno.env.get('VALIDATION_TIMEOUT_SECONDS') || '8')
    };
}

// Crear reporte de validación resumido
export function createValidationSummary(results: any[]): any {
    const verified = results.filter(r => r.validation_status === 'verified').length;
    const partial = results.filter(r => r.validation_status === 'partial').length;
    const failed = results.filter(r => r.validation_status === 'failed').length;
    const notValidated = results.filter(r => r.validation_status === 'not_validated').length;
    const notValidatable = results.filter(r => r.validation_status === 'not_validatable').length;
    
    const total = results.length;
    const averageScore = results.reduce((sum, r) => sum + (r.reliability_score || 0), 0) / total;
    
    return {
        total,
        verified,
        partial,
        failed,
        not_validated: notValidated,
        not_validatable: notValidatable,
        success_rate: total > 0 ? Math.round(((verified + partial) / total) * 100) : 0,
        average_reliability_score: Math.round(averageScore),
        validation_enabled: verified + partial + failed > 0
    };
}