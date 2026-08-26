import pytest
from backend.services.rag import RAGService
from backend.services.llm import LLMService


def test_es_pregunta_dependiente_anaphora():
    rag = RAGService()
    historial = [
        {'role': 'user', 'content': 'que pasa si falto a el trabajo'},
        {'role': 'assistant', 'content': 'El artículo 53 del Reglamento Interno establece...'}
    ]

    # Preguntas de seguimiento dependientes
    assert rag._es_pregunta_dependiente('pero si no estoy de vacaciones?', historial) is True
    assert rag._es_pregunta_dependiente('y que sanciones aplican?', historial) is True
    assert rag._es_pregunta_dependiente('en ese caso qué pasa?', historial) is True
    assert rag._es_pregunta_dependiente('y si no?', historial) is True
    assert rag._es_pregunta_dependiente('cuánto?', historial) is True

    # Preguntas independientes completas
    assert rag._es_pregunta_dependiente('¿Cuál es la jornada laboral establecida para los empleados?', historial) is False
    assert rag._es_pregunta_dependiente('¿Cuáles son las políticas de seguridad de contraseñas?', historial) is False


def test_es_pregunta_dependiente_sin_historial():
    rag = RAGService()
    # Sin historial previo, ninguna pregunta puede ser tratada como dependiente
    assert rag._es_pregunta_dependiente('pero si no estoy de vacaciones?', []) is False
    assert rag._es_pregunta_dependiente('¿Cuál es el horario?', []) is False


def test_reescribir_query_contextual_fallback():
    llm = LLMService()
    # Si historial está vacío, debe devolver la pregunta original de forma segura
    pregunta = '¿Cuáles son las obligaciones?'
    res = llm.reescribir_query_contextual(pregunta, [])
    assert res == pregunta
