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


def test_formatear_historial_no_mutila_respuestas_largas():
    llm = LLMService()
    respuesta_larga = (
        "De conformidad con el Artículo 53 del Reglamento Interno de Trabajo de la empresa, "
        "la primera falta injustificada conlleva una suspensión disciplinaria de 1 a 8 días hábiles "
        "sin goce de salario, la cual deberá ser notificada formalmente al trabajador dentro de los "
        "siguientes tres días hábiles por el departamento de Gestión Humana."
    )
    assert len(respuesta_larga) > 250  # Claramente mayor a los 180 chars anteriores

    historial = [
        {'role': 'user', 'content': '¿Qué pasa si falto al trabajo sin avisar?'},
        {'role': 'assistant', 'content': respuesta_larga}
    ]

    formateado = llm._formatear_historial(historial, max_turnos=4, max_chars_por_turno=1000)
    # Debe contener la respuesta completa sin cortar a 180 caracteres
    assert respuesta_larga in formateado
    assert "Gestión Humana." in formateado
    assert "Empleado: ¿Qué pasa si falto al trabajo sin avisar?" in formateado


def test_construir_prompt_con_historial():
    llm = LLMService()
    historial = [
        {'role': 'user', 'content': '¿Cuántos días de vacaciones tengo?'},
        {'role': 'assistant', 'content': 'Tienes derecho a 15 días hábiles de vacaciones remuneradas por cada año cumplido de servicio.'}
    ]
    prompt = llm._construir_prompt(
        pregunta='¿Y cuándo puedo solicitarlas?',
        contexto='[politica.pdf, p.5]: Las vacaciones se solicitan con 15 días de anticipación.',
        fuentes='- politica.pdf, p.5',
        historial=historial
    )
    assert "HISTORIAL PREVIO DE LA CONVERSACIÓN:" in prompt
    assert "15 días hábiles de vacaciones" in prompt
    assert "¿Y cuándo puedo solicitarlas?" in prompt


def test_detectar_cambio_tema():
    rag = RAGService()
    historial = [
        {'role': 'user', 'content': '¿Cómo se calculan los días de vacaciones?'},
        {'role': 'assistant', 'content': 'Tienes 15 días hábiles por año cumplido de servicio.'}
    ]

    # Cambio explícito de tema
    assert rag._detectar_cambio_tema('Cambiando de tema, ¿cuál es la política de seguridad para contraseñas?', historial) is True
    # Pregunta sobre un tema completamente disjunto (seguridad/contraseñas vs vacaciones)
    assert rag._detectar_cambio_tema('¿Cuáles son las políticas de seguridad de contraseñas de la empresa?', historial) is True
    # Continuidad / pregunta dependiente NO es cambio de tema
    assert rag._detectar_cambio_tema('¿Y si no las tomo en ese año?', historial) is False
    assert rag._detectar_cambio_tema('¿cuándo se pagan?', historial) is False


def test_audit_service(db_session=None):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from backend.database import Base
    from backend.services.audit import AuditService

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        log = AuditService.registrar_evento(
            db=session,
            action="LOGIN_SUCCESS",
            resource="/auth/login",
            user_id=1,
            user_email="admin@policylens.com",
            ip_address="127.0.0.1",
            status="SUCCESS",
            details="Test audit log"
        )
        assert log is not None
        assert log.ip_address == "127.0.0.1"
    finally:
        session.close()


def test_reformular_query_heuristica():
    rag = RAGService()
    historial = [
        {'role': 'user', 'content': '¿Cuántos días de vacaciones me corresponden por ley?'},
        {'role': 'assistant', 'content': 'Tienes derecho a 15 días hábiles de vacaciones.'}
    ]

    # Reformulación de seguimiento dependiente: debe incorporar términos del tema previo sin llamar al LLM
    query_ref = rag._reformular_query_heuristica('¿y cuándo puedo solicitarlas?', historial)
    assert "vacaciones" in query_ref.lower() or "dias" in query_ref.lower()
    assert "solicitarlas" in query_ref.lower()

    # Caso con artículos normativos previos
    historial_art = [
        {'role': 'user', 'content': '¿Qué establece el artículo 53 sobre las faltas?'},
        {'role': 'assistant', 'content': 'El artículo 53 establece sanciones por faltas.'}
    ]
    query_art = rag._reformular_query_heuristica('¿cuáles son las consecuencias?', historial_art)
    assert "articulo 53" in query_art.lower() or "faltas" in query_art.lower()


def test_umbral_cos_fallback_calibrado():
    from backend.services.rag import UMBRAL_COS_FALLBACK
    # Validar que el umbral de fallback esté en el rango estricto contra ruido (40.0 - 42.0)
    assert 40.0 <= UMBRAL_COS_FALLBACK <= 42.0



