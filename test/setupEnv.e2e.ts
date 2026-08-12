/**
 * e2e 테스트용 환경변수. 테스트 파일보다 먼저 실행된다(jest setupFiles).
 *
 * 개발용 DB(cgate)가 아니라 cgate_test를 보게 만든다. 테스트는 테이블을
 * 통째로 비우므로, 이걸 빠뜨리면 로컬 개발 데이터가 날아간다.
 *
 * dotenv는 이미 있는 process.env 값을 덮어쓰지 않으므로 여기서 정한 값이 이긴다.
 */
process.env.DB_DATABASE = 'cgate_test';
process.env.PRISMA_URL = 'mysql://root:password@localhost:3310/cgate_test';

/** StubAuthGuard는 APP_ENV가 local일 때만 동작한다(그 외에는 401). */
process.env.APP_ENV = 'local';
